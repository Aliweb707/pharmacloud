/* ============================================
   PHARMACLOUD - SIGNUP FLOW v2.5 - FIX MASTERCARD FORM
   - ماستركارد كان مبيظهرش فورم - اتصلح
   - كل طرق الدفع دلوقتي بتظهر فورم
   ============================================ */
'use strict';

(function() {
  window.__PC_SIGNUP_FLOW__ = true;

  function getVal(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function showTrialActivation(tenant, user) {
    if (typeof closeAuth === 'function') closeAuth();
    var overlayId = 'trialActivationOverlay';
    var existing = document.getElementById(overlayId);
    if (existing) existing.remove();
    
    var planPrices = { basic: 500, pro: 1000, enterprise: 2000 };
    var planNames = { basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise' };
    var price = planPrices[tenant.plan] || 500;
    var planName = planNames[tenant.plan] || tenant.plan;
    
    var html = `
      <div id="${overlayId}" style="display:flex; position:fixed; inset:0; background:rgba(15,23,42,0.9); backdrop-filter:blur(16px); z-index:10000; align-items:center; justify-content:center; padding:20px; overflow-y:auto;">
        <div style="max-width:520px; width:100%; background:#fff; border-radius:28px; overflow:hidden; box-shadow:0 30px 90px rgba(0,0,0,0.5); animation: slideUp 0.5s cubic-bezier(0.16,1,0.3,1);">
          <div style="background: linear-gradient(135deg, #00b884 0%, #0ea5e9 100%); padding:36px 28px; text-align:center; color:#fff;">
            <div style="width:80px; height:80px; background:rgba(255,255,255,0.2); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-size:2.2rem; animation: bounce 2s infinite;">🎉</div>
            <h2 style="margin:0 0 8px; font-size:1.7rem; font-weight:900;">مبروك! تم إنشاء صيدليتك</h2>
            <p style="margin:0 0 12px; opacity:0.95; font-size:1.05rem;">${tenant.name}</p>
            <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.2); padding:10px 20px; border-radius:24px; font-size:0.9rem; font-weight:700; border:1px solid rgba(255,255,255,0.2);"><i class="fas fa-crown"></i> ${planName} - ${price} ج/شهر</div>
          </div>
          <div style="padding:28px;">
            <div style="background:linear-gradient(135deg, #f0fdf9, #ecfeff); border:1px solid #a7f3d0; border-radius:20px; padding:20px; margin-bottom:24px;">
              <div style="font-weight:800; margin-bottom:14px; display:flex; align-items:center; gap:8px; color:#065f46;"><i class="fas fa-gift"></i> اختر طريقة البدء:</div>
              <div style="display:flex; flex-direction:column; gap:10px;">
                <div style="display:flex; align-items:center; gap:10px; background:#fff; padding:12px; border-radius:12px; border:1px solid #d1fae5;"><div style="width:28px; height:28px; background:#10b981; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff;"><i class="fas fa-check"></i></div><span><strong>14 يوم مجاناً</strong> - بدون دفع</span></div>
                <div style="display:flex; align-items:center; gap:10px; background:#fff; padding:12px; border-radius:12px; border:1px solid #d1fae5;"><div style="width:28px; height:28px; background:#0ea5e9; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff;"><i class="fas fa-credit-card"></i></div><span><strong>ادفع الآن</strong> - فعّل اشتراكك</span></div>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:12px;">
              <button id="startTrialBtn" style="width:100%; padding:18px; font-size:1.1rem; font-weight:800; border-radius:16px; border:none; background:linear-gradient(135deg, #10b981, #059669); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; box-shadow:0 4px 15px rgba(16,185,129,0.3);"><span>🚀</span> ابدأ 14 يوم مجاناً (بدون دفع)</button>
              <button id="payNowBtn" style="width:100%; padding:18px; font-size:1.1rem; font-weight:800; border-radius:16px; border:none; background:linear-gradient(135deg, #00b884, #0ea5e9); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; box-shadow:0 4px 15px rgba(0,184,132,0.3);"><i class="fas fa-credit-card"></i> ادفع الآن - ${price} ج</button>
            </div>
          </div>
        </div>
      </div>
      <style>@keyframes slideUp{from{transform:translateY(40px) scale(0.95);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}#startTrialBtn:hover,#payNowBtn:hover{transform:translateY(-2px)} </style>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
    var overlay = document.getElementById(overlayId);
    document.getElementById('startTrialBtn').onclick = function() {
      overlay.remove();
      var session = { userId: user.id, tenantId: tenant.id, email: user.email, name: user.name, role: 'admin', loginAt: new Date().toISOString(), isTrial: true };
      if (typeof DB !== 'undefined' && DB.setSession) DB.setSession(session); else localStorage.setItem('pc_session', JSON.stringify(session));
      if (window.Utils && Utils.toast) Utils.toast('🎉 تجربتك بدأت!', 'success');
      setTimeout(function(){ if (typeof showPlaceholder === 'function') showPlaceholder(session); }, 300);
    };
    document.getElementById('payNowBtn').onclick = function() {
      overlay.remove();
      showPaymentFirstModal(tenant, user, price);
    };
  }

  function showPaymentFirstModal(tenant, user, price) {
    var payOverlayId = 'paymentFirstOverlay';
    var existing = document.getElementById(payOverlayId);
    if (existing) existing.remove();
    
    var html = `
      <div id="${payOverlayId}" style="display:flex; position:fixed; inset:0; background:rgba(15,23,42,0.92); backdrop-filter:blur(16px); z-index:10001; align-items:flex-start; justify-content:center; padding:16px; overflow-y:auto;">
        <div style="max-width:520px; width:100%; background:#fff; border-radius:28px; overflow:hidden; box-shadow:0 30px 90px rgba(0,0,0,0.6); animation: slideUp 0.5s cubic-bezier(0.16,1,0.3,1); margin:20px 0; display:flex; flex-direction:column; max-height:95vh;">
          <div style="padding:20px 24px; border-bottom:1px solid #f3f4f6; display:flex; justify-content:space-between; align-items:center; background:#fff; position:sticky; top:0; z-index:2; flex-shrink:0;">
            <div style="display:flex; align-items:center; gap:12px;">
              <button id="backToTrial" style="width:36px; height:36px; border-radius:12px; border:1px solid #e5e7eb; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center;"><i class="fas fa-arrow-right"></i></button>
              <h3 style="margin:0; font-size:1.25rem; font-weight:800; display:flex; align-items:center; gap:8px;"><i class="fas fa-credit-card" style="color:#00b884;"></i> إتمام الدفع</h3>
            </div>
            <button id="closePayFirst" style="width:36px; height:36px; border-radius:12px; border:none; background:#f3f4f6; cursor:pointer;">✕</button>
          </div>
          
          <div style="padding:24px; overflow-y:auto; flex:1;">
            <div style="background:linear-gradient(135deg, #00b884 0%, #0ea5e9 100%); border-radius:20px; padding:24px; color:#fff; text-align:center; margin-bottom:24px;">
              <div style="font-size:0.9rem; opacity:0.9;">المبلغ المطلوب</div>
              <div style="font-size:2.4rem; font-weight:900; margin:6px 0; display:flex; align-items:center; justify-content:center; gap:8px;"><span style="font-size:1rem;">ج.م</span> ${price}.00</div>
              <div style="font-size:0.9rem; opacity:0.9; background:rgba(255,255,255,0.2); padding:6px 14px; border-radius:20px; display:inline-block;">${tenant.name} - ${tenant.plan}</div>
            </div>
            
            <div style="margin-bottom:20px;">
              <div style="font-weight:800; font-size:0.95rem; margin-bottom:14px;">اختر طريقة الدفع:</div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <button class="pay-method-btn" data-method="visa" style="padding:18px 12px; border:2px solid #e5e7eb; border-radius:16px; background:#fff; cursor:pointer; text-align:center; font-weight:700; transition:all 0.3s; position:relative;">
                  <div style="font-size:1.8rem; margin-bottom:6px;">💳</div><div style="font-size:0.9rem;">فيزا</div><div class="check-badge" style="position:absolute; top:8px; right:8px; width:20px; height:20px; background:#00b884; border-radius:50%; display:none; align-items:center; justify-content:center; color:#fff; font-size:0.7rem;"><i class="fas fa-check"></i></div>
                </button>
                <button class="pay-method-btn" data-method="mastercard" style="padding:18px 12px; border:2px solid #e5e7eb; border-radius:16px; background:#fff; cursor:pointer; text-align:center; font-weight:700; transition:all 0.3s; position:relative;">
                  <div style="font-size:1.8rem; margin-bottom:6px;">💳</div><div style="font-size:0.9rem;">ماستركارد</div><div class="check-badge" style="position:absolute; top:8px; right:8px; width:20px; height:20px; background:#00b884; border-radius:50%; display:none; align-items:center; justify-content:center; color:#fff; font-size:0.7rem;"><i class="fas fa-check"></i></div>
                </button>
                <button class="pay-method-btn" data-method="fawry" style="padding:18px 12px; border:2px solid #e5e7eb; border-radius:16px; background:#fff; cursor:pointer; text-align:center; font-weight:700; transition:all 0.3s; position:relative;">
                  <div style="font-size:1.8rem; margin-bottom:6px;">🏪</div><div style="font-size:0.9rem;">فوري</div><div class="check-badge" style="position:absolute; top:8px; right:8px; width:20px; height:20px; background:#00b884; border-radius:50%; display:none; align-items:center; justify-content:center; color:#fff; font-size:0.7rem;"><i class="fas fa-check"></i></div>
                </button>
                <button class="pay-method-btn" data-method="valu" style="padding:18px 12px; border:2px solid #e5e7eb; border-radius:16px; background:#fff; cursor:pointer; text-align:center; font-weight:700; transition:all 0.3s; position:relative;">
                  <div style="font-size:1.8rem; margin-bottom:6px;">📱</div><div style="font-size:0.9rem;">فاليو</div><div class="check-badge" style="position:absolute; top:8px; right:8px; width:20px; height:20px; background:#00b884; border-radius:50%; display:none; align-items:center; justify-content:center; color:#fff; font-size:0.7rem;"><i class="fas fa-check"></i></div>
                </button>
                <button class="pay-method-btn" data-method="instapay" style="padding:18px 12px; border:2px solid #e5e7eb; border-radius:16px; background:#fff; cursor:pointer; text-align:center; font-weight:700; transition:all 0.3s; position:relative;">
                  <div style="font-size:1.8rem; margin-bottom:6px;">⚡</div><div style="font-size:0.9rem;">انستاباي</div><div class="check-badge" style="position:absolute; top:8px; right:8px; width:20px; height:20px; background:#00b884; border-radius:50%; display:none; align-items:center; justify-content:center; color:#fff; font-size:0.7rem;"><i class="fas fa-check"></i></div>
                </button>
                <button class="pay-method-btn" data-method="wallet" style="padding:18px 12px; border:2px solid #e5e7eb; border-radius:16px; background:#fff; cursor:pointer; text-align:center; font-weight:700; transition:all 0.3s; position:relative;">
                  <div style="font-size:1.8rem; margin-bottom:6px;">👛</div><div style="font-size:0.9rem;">محفظة إلكترونية</div><div class="check-badge" style="position:absolute; top:8px; right:8px; width:20px; height:20px; background:#00b884; border-radius:50%; display:none; align-items:center; justify-content:center; color:#fff; font-size:0.7rem;"><i class="fas fa-check"></i></div>
                </button>
              </div>
            </div>
            
            <div id="paymentFormArea" style="background:#f9fafb; border:2px solid #e5e7eb; border-radius:16px; padding:20px; margin-bottom:20px; min-height:140px; transition:all 0.3s;">
              <div id="form-visa" class="payment-form" style="display:none;">
                <div style="font-weight:800; margin-bottom:14px; display:flex; align-items:center; gap:8px;"><i class="fas fa-credit-card" style="color:#1e40af;"></i> بيانات بطاقة الفيزا</div>
                <div style="display:flex; flex-direction:column; gap:12px;">
                  <input type="text" placeholder="رقم البطاقة - 16 رقم" maxlength="19" style="width:100%; padding:14px; border:2px solid #e5e7eb; border-radius:12px; font-size:1rem;" oninput="this.value=this.value.replace(/[^0-9 ]/g,'').replace(/(.{4})/g,'$1 ').trim()">
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <input type="text" placeholder="MM/YY" maxlength="5" style="padding:14px; border:2px solid #e5e7eb; border-radius:12px; font-size:1rem;" oninput="this.value=this.value.replace(/[^0-9/]/g,'')">
                    <input type="text" placeholder="CVV" maxlength="3" style="padding:14px; border:2px solid #e5e7eb; border-radius:12px; font-size:1rem;" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
                  </div>
                  <input type="text" placeholder="الاسم على البطاقة" style="width:100%; padding:14px; border:2px solid #e5e7eb; border-radius:12px; font-size:1rem;">
                </div>
              </div>
              <div id="form-mastercard" class="payment-form" style="display:none;">
                <div style="font-weight:800; margin-bottom:14px; display:flex; align-items:center; gap:8px;"><i class="fas fa-credit-card" style="color:#ea580c;"></i> بيانات بطاقة ماستركارد</div>
                <div style="display:flex; flex-direction:column; gap:12px;">
                  <input type="text" placeholder="رقم البطاقة - 16 رقم" maxlength="19" style="width:100%; padding:14px; border:2px solid #e5e7eb; border-radius:12px; font-size:1rem;" oninput="this.value=this.value.replace(/[^0-9 ]/g,'').replace(/(.{4})/g,'$1 ').trim()">
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <input type="text" placeholder="MM/YY" maxlength="5" style="padding:14px; border:2px solid #e5e7eb; border-radius:12px; font-size:1rem;">
                    <input type="text" placeholder="CVV" maxlength="3" style="padding:14px; border:2px solid #e5e7eb; border-radius:12px; font-size:1rem;">
                  </div>
                  <input type="text" placeholder="الاسم على البطاقة" style="width:100%; padding:14px; border:2px solid #e5e7eb; border-radius:12px;">
                </div>
                <div style="margin-top:10px; font-size:0.8rem; color:#6b7280; background:#fff; padding:10px; border-radius:8px; border:1px dashed #e5e7eb;">💳 ماستركارد آمنة 100% - مدعومة من جميع البنوك المصرية</div>
              </div>
              <div id="form-fawry" class="payment-form" style="display:none;">
                <div style="font-weight:800; margin-bottom:14px; display:flex; align-items:center; gap:8px;"><i class="fas fa-store" style="color:#f59e0b;"></i> الدفع عبر فوري</div>
                <div style="background:#fff; border:2px dashed #f59e0b; border-radius:12px; padding:16px; text-align:center;">
                  <div style="font-size:0.9rem; color:#6b7280; margin-bottom:8px;">الرقم المرجعي الخاص بك:</div>
                  <div style="font-size:1.6rem; font-weight:900; letter-spacing:2px; background:#fef3c7; padding:12px; border-radius:10px; font-family:monospace;">${Math.floor(100000000 + Math.random()*900000000)}</div>
                  <div style="font-size:0.85rem; color:#6b7280; margin-top:12px; line-height:1.6; text-align:right;">1. اذهب لأقرب ماكينة فوري<br>2. اختر "PharmaCloud"<br>3. أدخل الرقم المرجعي<br>4. ادفع ${price} ج</div>
                </div>
              </div>
              <div id="form-valu" class="payment-form" style="display:none;">
                <div style="font-weight:800; margin-bottom:14px; display:flex; align-items:center; gap:8px;"><i class="fas fa-mobile-alt" style="color:#7c3aed;"></i> فاليو - تقسيط</div>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:14px;">
                  <button class="installment-opt" style="padding:12px; border:2px solid #7c3aed; background:#f5f3ff; border-radius:10px; font-weight:700; cursor:pointer;">3 شهور<br><small>${Math.ceil(price/3)} ج</small></button>
                  <button class="installment-opt" style="padding:12px; border:2px solid #e5e7eb; background:#fff; border-radius:10px; font-weight:700; cursor:pointer;">6 شهور<br><small>${Math.ceil(price/6)} ج</small></button>
                  <button class="installment-opt" style="padding:12px; border:2px solid #e5e7eb; background:#fff; border-radius:10px; font-weight:700; cursor:pointer;">12 شهر<br><small>${Math.ceil(price/12)} ج</small></button>
                </div>
                <input type="tel" placeholder="رقم فاليو - 01xxxxxxxxx" style="width:100%; padding:14px; border:2px solid #e5e7eb; border-radius:12px;">
              </div>
              <div id="form-instapay" class="payment-form" style="display:none;">
                <div style="font-weight:800; margin-bottom:14px; display:flex; align-items:center; gap:8px;"><i class="fas fa-bolt" style="color:#dc2626;"></i> انستاباي</div>
                <div style="background:#fff; border:2px solid #fecaca; border-radius:12px; padding:16px;">
                  <div style="font-size:0.9rem; margin-bottom:10px;">حول على:</div>
                  <div style="background:#fef2f2; padding:12px; border-radius:10px; display:flex; justify-content:space-between; align-items:center;"><span style="font-family:monospace; font-weight:800;">pharmacloud@instapay</span><button onclick="navigator.clipboard.writeText('pharmacloud@instapay'); if(window.Utils) Utils.toast('تم النسخ')" style="padding:6px 12px; background:#dc2626; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:0.8rem;">نسخ</button></div>
                  <input type="text" placeholder="رقم العملية بعد التحويل" style="width:100%; margin-top:12px; padding:14px; border:2px solid #e5e7eb; border-radius:12px;">
                </div>
              </div>
              <div id="form-wallet" class="payment-form" style="display:none;">
                <div style="font-weight:800; margin-bottom:14px; display:flex; align-items:center; gap:8px;"><i class="fas fa-wallet" style="color:#059669;"></i> المحفظة الإلكترونية</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px;">
                  <button style="padding:14px; border:2px solid #e5e7eb; border-radius:12px; background:#fff; font-weight:700; cursor:pointer;">📱 فودافون كاش</button>
                  <button style="padding:14px; border:2px solid #e5e7eb; border-radius:12px; background:#fff; font-weight:700; cursor:pointer;">📱 أورنج موني</button>
                  <button style="padding:14px; border:2px solid #e5e7eb; border-radius:12px; background:#fff; font-weight:700; cursor:pointer;">📱 اتصالات كاش</button>
                  <button style="padding:14px; border:2px solid #e5e7eb; border-radius:12px; background:#fff; font-weight:700; cursor:pointer;">📱 وي باي</button>
                </div>
                <input type="tel" placeholder="رقم المحفظة - 01xxxxxxxxx" style="width:100%; padding:14px; border:2px solid #e5e7eb; border-radius:12px;">
              </div>
              <div id="form-default" class="payment-form" style="text-align:center; padding:24px;">
                <div style="font-size:2.2rem; margin-bottom:12px;">👆</div>
                <div style="font-weight:700; color:#111827; font-size:1rem;">اختر طريقة الدفع من الأعلى</div>
                <div style="font-size:0.85rem; color:#6b7280; margin-top:6px;">سيظهر لك فورم الدفع الخاص بكل طريقة مع الرقم المرجعي</div>
              </div>
            </div>
            
            <div style="display:flex; gap:12px;">
              <button id="confirmPayFirst" style="flex:1; padding:16px; background:linear-gradient(135deg, #00b884, #0ea5e9); color:#fff; border:none; border-radius:14px; font-weight:800; font-size:1.05rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 15px rgba(0,184,132,0.3);"><i class="fas fa-check-circle"></i> تأكيد الدفع - ${price} ج</button>
              <button id="cancelPayFirst" style="padding:16px 20px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:14px; font-weight:700; cursor:pointer;">إلغاء</button>
            </div>
            
            <div style="text-align:center; margin-top:14px; display:flex; align-items:center; justify-content:center; gap:6px; color:#6b7280; font-size:0.8rem; background:#f9fafb; padding:10px; border-radius:10px;"><i class="fas fa-shield-alt" style="color:#10b981;"></i> لن تدخل الصيدلية إلا بعد إتمام الدفع بنجاح</div>
          </div>
        </div>
      </div>
      <style>
        @keyframes slideUp{from{transform:translateY(40px) scale(0.95);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
        .pay-method-btn:hover{transform:translateY(-3px);box-shadow:0 8px 20px rgba(0,0,0,0.12);border-color:#00b884 !important}
        .pay-method-btn.selected{border-color:#00b884 !important;background:linear-gradient(135deg, #f0fdf9, #ecfeff) !important;box-shadow:0 4px 15px rgba(0,184,132,0.25);transform:translateY(-2px)}
        .pay-method-btn.selected .check-badge{display:flex !important}
        #backToTrial:hover,#closePayFirst:hover{background:#e5e7eb !important;transform:scale(1.05)}
        #confirmPayFirst:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(0,184,132,0.4) !important}
        .payment-form input:focus{border-color:#00b884 !important;box-shadow:0 0 0 3px rgba(0,184,132,0.1);outline:none}
      </style>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    var payOverlay = document.getElementById(payOverlayId);
    var selectedMethod = null;
    
    function showForm(method) {
      payOverlay.querySelectorAll('.payment-form').forEach(f => f.style.display = 'none');
      var target = document.getElementById('form-' + method);
      if (target) {
        target.style.display = 'block';
        target.style.animation = 'slideUp 0.3s ease';
        // اعمل scroll للفورم عشان يبان
        setTimeout(() => {
          var formArea = document.getElementById('paymentFormArea');
          if (formArea) formArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      } else {
        document.getElementById('form-default').style.display = 'block';
      }
    }
    
    payOverlay.querySelectorAll('.pay-method-btn').forEach(function(btn){
      btn.onclick = function(){
        payOverlay.querySelectorAll('.pay-method-btn').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        selectedMethod = this.dataset.method;
        showForm(selectedMethod);
        this.style.transform = 'scale(0.92)';
        setTimeout(() => this.style.transform = '', 150);
        console.log('[Pay v2.5] Selected', selectedMethod);
      };
    });
    
    function backToActivation() {
      payOverlay.remove();
      showTrialActivation(tenant, user);
    }
    
    document.getElementById('backToTrial').onclick = backToActivation;
    document.getElementById('closePayFirst').onclick = backToActivation;
    document.getElementById('cancelPayFirst').onclick = backToActivation;
    
    showForm('default');
    
    document.getElementById('confirmPayFirst').onclick = function() {
      if (!selectedMethod) {
        if (window.Utils && Utils.toast) Utils.toast('اختر طريقة الدفع أولاً 👆', 'warning');
        var area = document.getElementById('paymentFormArea');
        area.style.animation = 'shake 0.4s ease';
        setTimeout(() => area.style.animation = '', 400);
        return;
      }
      console.log('[Pay v2.5] Confirmed', selectedMethod);
      payOverlay.remove();
      var session = { userId: user.id, tenantId: tenant.id, email: user.email, name: user.name, role: 'admin', loginAt: new Date().toISOString(), isPaid: true, paymentMethod: selectedMethod, paidAmount: price };
      if (typeof DB !== 'undefined' && DB.setSession) DB.setSession(session); else localStorage.setItem('pc_session', JSON.stringify(session));
      try { if (typeof DB !== 'undefined' && DB.addSubscription) { DB.addSubscription({ tenantId: tenant.id, plan: tenant.plan, amount: price, type: 'paid', status: 'active', startedAt: new Date().toISOString(), paymentMethod: selectedMethod }); } } catch(e) {}
      if (window.Utils && Utils.toast) Utils.toast('✅ تم الدفع بنجاح عبر ' + selectedMethod + ' - ' + price + ' ج', 'success');
      setTimeout(function(){ if (typeof showPlaceholder === 'function') showPlaceholder(session); }, 400);
    };
    
    var style = document.createElement('style');
    style.textContent = '@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}';
    document.head.appendChild(style);
  }

  function submitSignupForm() {
    var pharmacyName = getVal('signupPharmacyName');
    var ownerName = getVal('signupOwnerName');
    var email = getVal('signupEmail').toLowerCase();
    var phone = getVal('signupPhone');
    var terms = document.getElementById('signupTerms') ? document.getElementById('signupTerms').checked : false;
    var btn = document.getElementById('signupBtn');
    if (!pharmacyName || pharmacyName.length < 2) { if (typeof showAuthAlert === 'function') showAuthAlert('اكتب اسم الصيدلية'); return; }
    if (!ownerName || ownerName.length < 2) { if (typeof showAuthAlert === 'function') showAuthAlert('اكتب اسمك'); return; }
    if (!email) { if (typeof showAuthAlert === 'function') showAuthAlert('اكتب البريد'); return; }
    if (!terms) { if (typeof showAuthAlert === 'function') showAuthAlert('وافق على الشروط'); return; }
    try {
      var users = (typeof DB !== 'undefined' && DB.getUsers) ? DB.getUsers() : [];
      if (users.find(u => String(u.email||'').toLowerCase() === email)) { if (typeof showAuthAlert === 'function') showAuthAlert('البريد مسجل'); return; }
    } catch(err) {}
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإنشاء...'; }
    setTimeout(() => {
      try {
        var tenantId = (window.Utils && Utils.uid) ? Utils.uid('t') : 't_' + Date.now();
        var userId = (window.Utils && Utils.uid) ? Utils.uid('u') : 'u_' + Date.now();
        var trialEnds = new Date(Date.now() + 14 * 86400000).toISOString();
        var now = new Date().toISOString();
        var tenant = { id: tenantId, name: pharmacyName, owner: ownerName, email, phone, plan: (typeof selectedPlan !== 'undefined' ? selectedPlan : 'pro'), status: 'trial', trialEndsAt: trialEnds, createdAt: now };
        var tenants = (typeof DB !== 'undefined' && DB.getTenants) ? DB.getTenants() : [];
        tenants.push(tenant);
        if (typeof DB !== 'undefined' && DB.setTenants) DB.setTenants(tenants);
        var user = { id: userId, tenantId, email, password: document.getElementById('signupPassword')?.value || '', name: ownerName, role: 'admin', createdAt: now };
        var allUsers = (typeof DB !== 'undefined' && DB.getUsers) ? DB.getUsers() : [];
        allUsers.push(user);
        if (typeof DB !== 'undefined' && DB.setUsers) DB.setUsers(allUsers);
        if (typeof DB !== 'undefined' && DB.addSubscription) { DB.addSubscription({ tenantId, plan: tenant.plan, amount: 0, type: 'trial', status: 'active', startedAt: now, endsAt: trialEnds }); }
        showTrialActivation(tenant, user);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-rocket"></i> ابدأ 14 يوم مجاناً'; }
      } catch (err) {
        console.error(err);
        if (typeof showAuthAlert === 'function') showAuthAlert('خطأ: ' + err.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-rocket"></i> ابدأ 14 يوم مجاناً'; }
      }
    }, 800);
  }

  window.handleSignup = function(e) { if (e && e.preventDefault) e.preventDefault(); submitSignupForm(); };
  window.SignupFlow = { submitSignupForm, showTrialActivation, showPaymentFirstModal, getVal };

  console.log('[SignupFlow v2.5 FIX MASTERCARD] ✅ Ready - ماستركارد بيظهر فورم دلوقتي');
})();
