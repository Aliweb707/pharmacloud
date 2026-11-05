/* ============================================
   PHARMACLOUD - AI ENGINE v1.0
   Shared ML/AI Algorithms for All Features
   ============================================ */
'use strict';

(function() {

  var AIE = {
    cache: {},
    cacheTTL: 5 * 60 * 1000  // 5 minutes
  };

  /* ============================================
     CACHE HELPER
     ============================================ */
  function cached(key, fn) {
    var now = Date.now();
    var c = AIE.cache[key];
    if (c && (now - c.at) < AIE.cacheTTL) return c.value;
    var value = fn();
    AIE.cache[key] = { value: value, at: now };
    return value;
  }

  /* ============================================
     1. CUSTOMER SEGMENTATION (RFM Analysis)
     Recency, Frequency, Monetary
     ============================================ */
  function segmentCustomers() {
    return cached('segments', function() {
      var customers = [];
      var orders = [];
      try {
        if (typeof PH !== 'undefined') {
          customers = PH.getCustomers() || [];
          orders = PH.getOrders() || [];
        }
      } catch (e) { return []; }

      if (customers.length === 0) return [];

      var now = Date.now();
      var DAY = 86400000;

      // Build RFM per customer
      var rfm = customers.map(function(c) {
        var custOrders = orders.filter(function(o) { return o.customerId === c.id; });
        var lastOrder = custOrders.length > 0
          ? Math.max.apply(null, custOrders.map(function(o) { return new Date(o.createdAt).getTime(); }))
          : 0;

        var recencyDays = lastOrder ? Math.floor((now - lastOrder) / DAY) : 9999;
        var frequency = custOrders.length;
        var monetary = custOrders.reduce(function(s, o) { return s + (o.total || 0); }, 0);

        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          recencyDays: recencyDays,
          frequency: frequency,
          monetary: monetary,
          lastOrderAt: lastOrder ? new Date(lastOrder).toISOString() : null
        };
      });

      // Compute percentiles for scoring
      var recencies = rfm.map(function(x) { return x.recencyDays; }).sort(function(a, b) { return a - b; });
      var frequencies = rfm.map(function(x) { return x.frequency; }).sort(function(a, b) { return a - b; });
      var monetaries = rfm.map(function(x) { return x.monetary; }).sort(function(a, b) { return a - b; });

      function percentile(sorted, value, invert) {
        var idx = sorted.indexOf(value);
        var pct = sorted.length > 1 ? (idx / (sorted.length - 1)) * 100 : 50;
        return invert ? 100 - pct : pct;
      }

      // Classify each customer
      rfm.forEach(function(c) {
        var rScore = percentile(recencies, c.recencyDays, true);  // Lower recency = higher score
        var fScore = percentile(frequencies, c.frequency, false);
        var mScore = percentile(monetaries, c.monetary, false);

        c.rScore = Math.round(rScore);
        c.fScore = Math.round(fScore);
        c.mScore = Math.round(mScore);
        c.rfmScore = (rScore + fScore + mScore) / 3;

        // Segment assignment
        if (c.rScore >= 70 && c.fScore >= 70 && c.mScore >= 70) {
          c.segment = 'champions';
          c.segmentLabel = 'أبطال';
          c.segmentColor = '#10b981';
          c.segmentIcon = 'fa-crown';
        } else if (c.rScore >= 50 && c.fScore >= 50 && c.mScore >= 50) {
          c.segment = 'loyal';
          c.segmentLabel = 'مخلصون';
          c.segmentColor = '#1E88E5';
          c.segmentIcon = 'fa-heart';
        } else if (c.rScore >= 70 && c.fScore < 50) {
          c.segment = 'promising';
          c.segmentLabel = 'واعدون';
          c.segmentColor = '#7c3aed';
          c.segmentIcon = 'fa-rocket';
        } else if (c.rScore < 30 && c.fScore >= 50) {
          c.segment = 'at_risk';
          c.segmentLabel = 'في خطر';
          c.segmentColor = '#f59e0b';
          c.segmentIcon = 'fa-exclamation-triangle';
        } else if (c.rScore < 20 && c.fScore < 30) {
          c.segment = 'lost';
          c.segmentLabel = 'مفقودون';
          c.segmentColor = '#94a3b8';
          c.segmentIcon = 'fa-user-slash';
        } else {
          c.segment = 'new';
          c.segmentLabel = 'جدد';
          c.segmentColor = '#06b6d4';
          c.segmentIcon = 'fa-user-plus';
        }
      });

      return rfm.sort(function(a, b) { return b.rfmScore - a.rfmScore; });
    });
  }

  /* ============================================
     2. CHURN PREDICTION
     Probability a customer will not return
     ============================================ */
  function predictChurn(customerId) {
    var segments = segmentCustomers();
    var c = segments.find(function(x) { return x.id === customerId; });
    if (!c) return null;

    // Simple heuristic model based on RFM + behavior
    var churnScore = 0;

    // Recency is the biggest factor
    if (c.recencyDays > 90) churnScore += 60;
    else if (c.recencyDays > 60) churnScore += 45;
    else if (c.recencyDays > 30) churnScore += 30;
    else if (c.recencyDays > 14) churnScore += 15;
    else churnScore += 5;

    // Frequency
    if (c.frequency === 0) churnScore += 20;
    else if (c.frequency === 1) churnScore += 15;
    else if (c.frequency <= 3) churnScore += 8;

    // Monetary
    if (c.monetary === 0) churnScore += 10;
    else if (c.monetary < 200) churnScore += 5;

    // Cap at 100
    churnScore = Math.min(100, churnScore);

    var risk = 'low';
    var label = 'منخفض';
    var color = '#10b981';
    if (churnScore >= 70) { risk = 'critical'; label = 'حرج'; color = '#dc2626'; }
    else if (churnScore >= 50) { risk = 'high'; label = 'عالي'; color = '#ea580c'; }
    else if (churnScore >= 30) { risk = 'medium'; label = 'متوسط'; color = '#f59e0b'; }

    return {
      customerId: customerId,
      name: c.name,
      phone: c.phone,
      churnScore: churnScore,
      risk: risk,
      riskLabel: label,
      riskColor: color,
      recencyDays: c.recencyDays,
      frequency: c.frequency,
      monetary: c.monetary,
      lastOrderAt: c.lastOrderAt,
      // Suggestion
      action: getRetentionAction(churnScore, c)
    };
  }

  function getRetentionAction(score, c) {
    if (score >= 70) {
      return {
        type: 'urgent',
        label: 'تدخل فوري',
        message: 'ابعت رسالة واتساب + عرض خاص 20% عشان ترجعه',
        color: '#dc2626',
        icon: 'fa-bolt'
      };
    }
    if (score >= 50) {
      return {
        type: 'high',
        label: 'إجراء مهم',
        message: 'اعرضله هدية أو نقاط مضاعفة عند الزيارة القادمة',
        color: '#ea580c',
        icon: 'fa-gift'
      };
    }
    if (score >= 30) {
      return {
        type: 'medium',
        label: 'متابعة',
        message: 'ابعتله رسالة تذكير ودّية',
        color: '#f59e0b',
        icon: 'fa-bell'
      };
    }
    return {
      type: 'low',
      label: 'مرتاح',
      message: 'عميل وفي — محتاج بس استمرارية',
      color: '#10b981',
      icon: 'fa-check-circle'
    };
  }

  /* ============================================
     3. NEXT VISIT PREDICTION
     When will this customer come back?
     ============================================ */
  function predictNextVisit(customerId) {
    var segments = segmentCustomers();
    var c = segments.find(function(x) { return x.id === customerId; });
    if (!c || c.frequency < 2) return null;

    // Average interval between visits
    var orders = [];
    try {
      if (typeof PH !== 'undefined') {
        orders = (PH.getOrders() || []).filter(function(o) { return o.customerId === customerId; });
      }
    } catch (e) { return null; }

    if (orders.length < 2) return null;

    orders.sort(function(a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
    var intervals = [];
    for (var i = 1; i < orders.length; i++) {
      var diff = new Date(orders[i].createdAt) - new Date(orders[i - 1].createdAt);
      intervals.push(diff / 86400000);
    }

    var avgInterval = intervals.reduce(function(s, x) { return s + x; }, 0) / intervals.length;
    var lastOrder = orders[orders.length - 1];
    var daysSinceLast = (Date.now() - new Date(lastOrder.createdAt).getTime()) / 86400000;
    var daysUntilNext = Math.max(0, avgInterval - daysSinceLast);

    return {
      avgIntervalDays: Math.round(avgInterval),
      daysSinceLast: Math.round(daysSinceLast),
      daysUntilNext: Math.round(daysUntilNext),
      expectedDate: new Date(Date.now() + daysUntilNext * 86400000),
      isOverdue: daysSinceLast > avgInterval * 1.5
    };
  }

  /* ============================================
     4. MARKET BASKET ANALYSIS (Frequently Bought Together)
     ============================================ */
  function getMarketBasket(minSupport) {
    minSupport = minSupport || 2;
    return cached('basket_' + minSupport, function() {
      var orders = [];
      try {
        if (typeof PH !== 'undefined') orders = PH.getOrders() || [];
      } catch (e) { return []; }

      // Build pairs
      var pairs = {};
      var productNames = {};

      orders.forEach(function(o) {
        var items = (o.items || []).slice(0, 10);  // Limit
        for (var i = 0; i < items.length; i++) {
          for (var j = i + 1; j < items.length; j++) {
            var a = items[i].id, b = items[j].id;
            if (a === b) continue;
            var key = [a, b].sort().join('|');
            pairs[key] = (pairs[key] || 0) + 1;
            productNames[a] = items[i].name;
            productNames[b] = items[j].name;
          }
        }
      });

      var results = Object.keys(pairs)
        .filter(function(k) { return pairs[k] >= minSupport; })
        .map(function(k) {
          var parts = k.split('|');
          return {
            productA: { id: parts[0], name: productNames[parts[0]] },
            productB: { id: parts[1], name: productNames[parts[1]] },
            count: pairs[k]
          };
        })
        .sort(function(a, b) { return b.count - a.count; })
        .slice(0, 20);

      return results;
    });
  }

  /* ============================================
     5. PRODUCT RECOMMENDATION
     For a given customer or product
     ============================================ */
  function recommendForCustomer(customerId, limit) {
    limit = limit || 5;
    var orders = [];
    try {
      if (typeof PH !== 'undefined') orders = PH.getOrders() || [];
    } catch (e) { return []; }

    var custOrders = orders.filter(function(o) { return o.customerId === customerId; });
    if (custOrders.length === 0) return [];

    // Get products they bought
    var bought = {};
    custOrders.forEach(function(o) {
      (o.items || []).forEach(function(it) {
        bought[it.id] = true;
      });
    });

    // Find "frequently bought together" with what they bought
    var basket = getMarketBasket(2);
    var scores = {};

    basket.forEach(function(pair) {
      if (bought[pair.productA.id] && !bought[pair.productB.id]) {
        scores[pair.productB.id] = (scores[pair.productB.id] || 0) + pair.count;
        scores[pair.productB.id + '_name'] = pair.productB.name;
      }
      if (bought[pair.productB.id] && !bought[pair.productA.id]) {
        scores[pair.productA.id] = (scores[pair.productA.id] || 0) + pair.count;
        scores[pair.productA.id + '_name'] = pair.productA.name;
      }
    });

    return Object.keys(scores)
      .filter(function(k) { return !k.endsWith('_name'); })
      .map(function(id) {
        return {
          id: id,
          name: scores[id + '_name'] || '—',
          score: scores[id]
        };
      })
      .sort(function(a, b) { return b.score - a.score; })
      .slice(0, limit);
  }

  /* ============================================
     6. ANOMALY DETECTION (Z-Score + IQR)
     For sales / behavior anomalies
     ============================================ */
  function detectAnomalies(data, options) {
    options = options || {};
    var threshold = options.threshold || 2.5;

    if (!data || data.length < 5) return [];

    // Calculate mean and std
    var mean = data.reduce(function(s, x) { return s + x.value; }, 0) / data.length;
    var variance = data.reduce(function(s, x) { return s + Math.pow(x.value - mean, 2); }, 0) / data.length;
    var std = Math.sqrt(variance);

    // Also IQR
    var sorted = data.map(function(x) { return x.value; }).sort(function(a, b) { return a - b; });
    var q1 = sorted[Math.floor(sorted.length * 0.25)];
    var q3 = sorted[Math.floor(sorted.length * 0.75)];
    var iqr = q3 - q1;
    var lowerFence = q1 - 1.5 * iqr;
    var upperFence = q3 + 1.5 * iqr;

    var anomalies = [];
    data.forEach(function(d) {
      var z = std > 0 ? (d.value - mean) / std : 0;
      var isOutlier = d.value < lowerFence || d.value > upperFence;

      if (Math.abs(z) >= threshold || isOutlier) {
        anomalies.push({
          label: d.label,
          value: d.value,
          zScore: +z.toFixed(2),
          direction: z > 0 ? 'high' : 'low',
          severity: Math.abs(z) >= 3 ? 'extreme' : 'mild',
          deviation: Math.abs(d.value - mean),
          mean: +mean.toFixed(2),
          expected: +mean.toFixed(2)
        });
      }
    });

    return anomalies;
  }

  /* ============================================
     7. TIME SERIES FORECASTING
     Moving Average + Trend + Seasonality
     ============================================ */
  function forecast(data, periods) {
    periods = periods || 7;
    if (!data || data.length < 3) return [];

    var values = data.map(function(d) { return d.value; });

    // Simple exponential smoothing
    var alpha = 0.3;
    var smoothed = [values[0]];
    for (var i = 1; i < values.length; i++) {
      smoothed.push(alpha * values[i] + (1 - alpha) * smoothed[i - 1]);
    }

    // Linear trend
    var n = values.length;
    var sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (var j = 0; j < n; j++) {
      sumX += j;
      sumY += values[j];
      sumXY += j * values[j];
      sumXX += j * j;
    }
    var slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    var intercept = (sumY - slope * sumX) / n;

    // Forecast
    var forecast = [];
    for (var k = 0; k < periods; k++) {
      var trendVal = slope * (n + k) + intercept;
      var smoothVal = smoothed[smoothed.length - 1];
      // Blend: 60% trend, 40% smoothed
      var predicted = Math.max(0, 0.6 * trendVal + 0.4 * smoothVal);
      forecast.push({
        index: n + k,
        value: Math.round(predicted * 100) / 100,
        confidence: Math.max(30, 90 - k * 8)  // Decreasing confidence
      });
    }

    return {
      forecast: forecast,
      trend: slope > 0.5 ? 'up' : slope < -0.5 ? 'down' : 'stable',
      trendSlope: +slope.toFixed(3),
      avgGrowth: values.length > 1
        ? +(((values[values.length - 1] - values[0]) / values[0]) * 100).toFixed(1)
        : 0
    };
  }

  /* ============================================
     8. PERSONALIZED OFFERS
     Generate offers per customer based on behavior
     ============================================ */
  function generatePersonalizedOffer(customerId) {
    var segments = segmentCustomers();
    var c = segments.find(function(x) { return x.id === customerId; });
    if (!c) return null;

    var churn = predictChurn(customerId);
    var offer = {
      customerId: customerId,
      customerName: c.name,
      segment: c.segment,
      segmentLabel: c.segmentLabel,
      offerType: 'general',
      offerTitle: '',
      offerBody: '',
      discount: 0,
      extraPoints: 0,
      urgency: 'normal',
      reason: '',
      validUntil: new Date(Date.now() + 7 * 86400000).toISOString()
    };

    // Champions → VIP treatment
    if (c.segment === 'champions') {
      offer.offerType = 'vip';
      offer.offerTitle = '🎁 مكافأة وفاء';
      offer.offerBody = 'شكراً لولائك! استمتع بـ 15% خصم على زيارتك القادمة';
      offer.discount = 15;
      offer.extraPoints = 50;
      offer.reason = 'عميل من فئة الأبطال';
    }
    // Loyal → Upsell
    else if (c.segment === 'loyal') {
      offer.offerType = 'upsell';
      offer.offerTitle = '⭐ فرصة ترقية';
      offer.offerBody = 'اشتري بمنتجات من فئة جديدة واكسب 100 نقطة إضافية';
      offer.extraPoints = 100;
      offer.reason = 'عميل مخلص — وقته نرقيه لمستوى أعلى';
    }
    // At risk → Retention
    else if (c.segment === 'at_risk' || (churn && churn.churnScore >= 50)) {
      offer.offerType = 'retention';
      offer.offerTitle = '❤️ وحشتنا!';
      offer.offerBody = 'خصم 20% + 100 نقطة إضافية عند الزيارة القادمة';
      offer.discount = 20;
      offer.extraPoints = 100;
      offer.urgency = 'high';
      offer.reason = 'عميل في خطر — محتاج عرض لاسترجاعه';
    }
    // Promising → Encourage
    else if (c.segment === 'promising') {
      offer.offerType = 'encourage';
      offer.offerTitle = '🚀 استمر!';
      offer.offerBody = 'خصم 10% عند الوصول بـ 500 نقطة';
      offer.discount = 10;
      offer.reason = 'عميل واعد — شجّعه على الشراء المتكرر';
    }
    // New → First repeat purchase
    else if (c.segment === 'new') {
      offer.offerType = 'welcome';
      offer.offerTitle = '👋 أهلاً بيك!';
      offer.offerBody = 'خصم 10% على ثاني زيارة';
      offer.discount = 10;
      offer.reason = 'عميل جديد — شجّعه على الزيارة الثانية';
    }
    // Default
    else {
      offer.offerType = 'standard';
      offer.offerTitle = '🎯 عرض خاص';
      offer.offerBody = 'خصم 5% + نقاط مضاعفة';
      offer.discount = 5;
      offer.reason = 'عرض عام';
    }

    return offer;
  }

  /* ============================================
     9. CUSTOMER LIFETIME VALUE (CLV)
     ============================================ */
  function calculateCLV(customerId) {
    var segments = segmentCustomers();
    var c = segments.find(function(x) { return x.id === customerId; });
    if (!c || c.frequency === 0) {
      return { clv: 0, avgOrderValue: 0, expectedVisits12m: 0, prediction: 'unclear' };
    }

    var avgOrderValue = c.monetary / c.frequency;

    // Estimate visits in next 12 months based on current frequency
    // If customer's been active for X days, extrapolate
    var firstOrder = null;
    var orders = [];
    try {
      if (typeof PH !== 'undefined') {
        orders = (PH.getOrders() || []).filter(function(o) { return o.customerId === customerId; });
      }
    } catch (e) {}

    if (orders.length > 0) {
      var sorted = orders.sort(function(a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
      firstOrder = sorted[0].createdAt;
    }

    var daysActive = firstOrder
      ? Math.max(1, (Date.now() - new Date(firstOrder).getTime()) / 86400000)
      : 30;

    var visitsPerDay = c.frequency / daysActive;
    var expectedVisits12m = Math.round(visitsPerDay * 365);
    var clv = expectedVisits12m * avgOrderValue;

    return {
      clv: Math.round(clv),
      avgOrderValue: Math.round(avgOrderValue),
      expectedVisits12m: expectedVisits12m,
      daysActive: Math.round(daysActive),
      prediction: clv > 5000 ? 'high_value' :
                  clv > 2000 ? 'medium_value' :
                  clv > 500 ? 'low_value' : 'unclear'
    };
  }

  /* ============================================
     10. SMART INVENTORY DEMAND FORECAST
     Predict product demand
     ============================================ */
  function forecastProductDemand(productId, days) {
    days = days || 7;
    var orders = [];
    try {
      if (typeof PH !== 'undefined') orders = PH.getOrders() || [];
    } catch (e) { return null; }

    // Aggregate daily sales for this product
    var dailySales = {};
    var last30 = orders.filter(function(o) {
      return (Date.now() - new Date(o.createdAt).getTime()) < 30 * 86400000;
    });

    last30.forEach(function(o) {
      var day = new Date(o.createdAt).toDateString();
      (o.items || []).forEach(function(it) {
        if (it.id === productId) {
          dailySales[day] = (dailySales[day] || 0) + it.qty;
        }
      });
    });

    var data = Object.keys(dailySales).map(function(d, i) {
      return { label: d, value: dailySales[d] };
    });

    if (data.length < 5) return null;

    var result = forecast(data, days);
    var avgDaily = data.reduce(function(s, d) { return s + d.value; }, 0) / data.length;
    var totalNeeded = Math.ceil(avgDaily * days * 1.2);  // 20% safety

    return {
      avgDaily: +avgDaily.toFixed(2),
      forecast: result,
      totalNeeded: totalNeeded,
      recommendation: result.trend === 'up'
        ? 'اطلب كمية أكبر — الطلب متزايد'
        : result.trend === 'down'
          ? 'قلل الكمية — الطلب متراجع'
          : 'اطلب كالمعتاد'
    };
  }

  /* ============================================
     11. SENTIMENT ANALYSIS (Voice/Text)
     ============================================ */
  function analyzeSentiment(text) {
    if (!text) return { score: 0, label: 'neutral', confidence: 0 };

    var lower = String(text).toLowerCase();

    var positive = [
      'شكرا', 'ممتاز', 'تمام', 'رائع', 'جميل', 'أحسنت', 'بطل', 'عظيم',
      'great', 'good', 'excellent', 'perfect', 'awesome', 'thanks'
    ];
    var negative = [
      'زفت', 'سيء', 'مش حلو', 'وحش', 'غلط', 'مش تمام', 'تعبان', 'زعلان',
      'bad', 'terrible', 'awful', 'wrong', 'broken', 'hate'
    ];
    var questions = ['ليه', 'إزاي', 'امتى', 'فين', 'إيه', 'why', 'how', 'when', 'where', 'what'];

    var posCount = 0, negCount = 0, qCount = 0;

    positive.forEach(function(w) { if (lower.indexOf(w) !== -1) posCount++; });
    negative.forEach(function(w) { if (lower.indexOf(w) !== -1) negCount++; });
    questions.forEach(function(w) { if (lower.indexOf(w) !== -1) qCount++; });

    var score = (posCount - negCount * 1.5);
    var label = score > 0.5 ? 'positive' :
                score < -0.5 ? 'negative' :
                qCount > 0 ? 'question' : 'neutral';

    return {
      score: +score.toFixed(2),
      label: label,
      confidence: Math.min(100, (posCount + negCount + qCount) * 25),
      counts: { positive: posCount, negative: negCount, questions: qCount }
    };
  }

  /* ============================================
     PUBLIC API
     ============================================ */
  window.AIEngine = {
    // Segmentation
    segmentCustomers: segmentCustomers,

    // Prediction
    predictChurn: predictChurn,
    predictNextVisit: predictNextVisit,
    calculateCLV: calculateCLV,

    // Recommendations
    getMarketBasket: getMarketBasket,
    recommendForCustomer: recommendForCustomer,
    generatePersonalizedOffer: generatePersonalizedOffer,

    // Analytics
    detectAnomalies: detectAnomalies,
    forecast: forecast,
    forecastProductDemand: forecastProductDemand,

    // NLP
    analyzeSentiment: analyzeSentiment,

    // Utilities
    clearCache: function() { AIE.cache = {}; },

    // Info
    version: '1.0.0'
  };

  console.log('[AI Engine v' + AIE.cacheTTL + '] Loaded ✓');
  console.log('[AI Engine] Algorithms: RFM, Churn, CLV, Market Basket, Forecast, Anomaly, Sentiment');
})();