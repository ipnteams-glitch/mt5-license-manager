// ระบุ ID ของ Spreadsheet จาก URL
var spreadsheetId = '1r7WhFV8Nl0kgtKiHMQYArjD8zWzXIHDMwWIO6IbTSj8';

// เปิดไฟล์ด้วย ID และเลือกชีตแรก (Index 0) หรือระบุชื่อชีต
var ss = SpreadsheetApp.openById(spreadsheetId);
var sheet = ss.getSheets()[0]; // เลือกชีตที่ 1

// ดึงค่าจากแถว 2 คอลัมน์ A (A2)
var apiKeyFromSheet = sheet.getRange("A2").getValue();

// ==========================================
// ⚙️ ส่วนตั้งค่า
// ==========================================
var daysToAdd = 365; //จำนวนวัน
var price = 4999;     //ราคา
// ==========================================

const CONFIG = {
  BASE_PRICE: price,       
  MY_PROMPTPAY: '0954149282',
  API_KEY: apiKeyFromSheet, 
  //1588768d-0845-45d3-94d5-fc00d0c3067d
  SHEET_IDS: [
    '1xyYSIFCo0On9neeQWisWre-wNl8z2JjpKpg7g_G4mI4', 
    '1Z7MAs8U0OCUxD_Y6jJM8E9LE9puYRjTlkwivbC5thpE'
  ],
  SHEET_MAIN: 'acc',
  SHEET_TEMP: 'temp_txn',
  // ลิงก์รูปภาพแบนเนอร์
  BANNER_URL: 'https://drive.usercontent.google.com/download?id=1-4zVaGWyUq0C0x3BCiMrey-noOcpfAnm'
};

function doGet(e) {
  var port = e.parameter.port;
  var eaId = e.parameter.ea;
  var mode = e.parameter.mode || ""; 

  if (!port || !eaId) return ContentService.createTextOutput("Error: Missing parameters.");

  var booking = reserveSatang(port, eaId);
  if (!booking) return ContentService.createTextOutput("Error: System Busy.");

  var finalAmount = CONFIG.BASE_PRICE + booking.satang;
  var qrData = generateMerchantQR(finalAmount);
  
  var scriptUrl = ScriptApp.getService().getUrl();
  var mobileUrl = scriptUrl + "?port=" + port + "&ea=" + eaId + "&mode=mobile";
  var mobileQrLink = "https://quickchart.io/qr?text=" + encodeURIComponent(mobileUrl) + "&size=300&margin=1&ecLevel=H";

  var html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;600&display=swap" rel="stylesheet">
        <title>ชำระค่าบริการ</title>
        <style>
          :root {
            --primary: #2563eb;
            --secondary: #64748b;
            --success: #22c55e;
            --bg-body: #f1f5f9;
            --bg-card: #ffffff;
            --shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          }
          
          body { font-family: 'Prompt', sans-serif; background: var(--bg-body); margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; color: #334155; }
          
          .container { 
            background: var(--bg-card); 
            width: 95%; 
            max-width: 800px; 
            border-radius: 20px; 
            box-shadow: var(--shadow); 
            overflow: hidden; /* ช่วยให้รูปที่อยู่ด้านบนโค้งตามขอบ container */
            position: relative;
          }

          /* Header Section พร้อมภาพพื้นหลัง */
          .header-section { 
            position: relative;
            background-image: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url('${CONFIG.BANNER_URL}'); 
            background-size: cover;
            background-position: center;
            padding: 3rem 2rem;
            text-align: center;
            color: white;
          }

          .header-title { font-size: 1.4rem; font-weight: 400; margin: 0; opacity: 0.9; }
          .price-large { font-size: 3.5rem; font-weight: 600; color: #fbbf24; line-height: 1; margin: 10px 0; text-shadow: 2px 2px 10px rgba(0,0,0,0.5); }
          .price-unit { font-size: 1.2rem; color: #fff; font-weight: 300; }
          .port-info { background: rgba(255,255,255,0.2); backdrop-filter: blur(5px); color: #fff; display: inline-block; padding: 4px 15px; border-radius: 50px; font-size: 0.85rem; margin-top: 10px; border: 1px solid rgba(255,255,255,0.3); }

          /* Content Area */
          .main-content { padding: 2rem; }

          .grid-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
            align-items: start;
          }

          .card-step {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 15px;
            padding: 1.5rem;
            text-align: center;
            position: relative;
          }

          .step-badge {
            background: var(--primary); color: white; width: 28px; height: 28px; 
            border-radius: 50%; display: flex; align-items: center; justify-content: center; 
            font-weight: bold; position: absolute; top: -14px; left: 50%; transform: translateX(-50%);
          }

          .qr-image { width: 100%; max-width: 200px; border-radius: 10px; margin: 15px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
          .timer-box { font-size: 1.1rem; color: #ef4444; font-weight: bold; background: #fee2e2; padding: 4px 12px; border-radius: 8px; display: inline-block; }
          .instruction-text { font-size: 0.85rem; color: var(--secondary); margin-top: 8px; }

          /* Mobile View */
          .mobile-upload-ui { text-align: center; padding: 1rem; }
          .btn-upload { background: var(--primary); color: white; padding: 15px; width: 100%; border: none; border-radius: 12px; font-size: 1rem; cursor: pointer; font-weight: 600; margin-top: 10px; }
          .hidden { display: none !important; }

          @media (max-width: 600px) {
            .grid-container { grid-template-columns: 1fr; }
            .header-section { padding: 2rem 1rem; }
            .price-large { font-size: 2.8rem; }
          }
        </style>
      </head>
      <body>

        <div class="container" id="main-interface">
          <div class="header-section">
            <h1 class="header-title">โปรโมชั่นแบบไม่จำกัดโบรค ${daysToAdd} วัน</h1>
            <div class="price-large">
              ${finalAmount.toFixed(2)} <span class="price-unit">บาท</span>
            </div>
            <div class="port-info">ID: ${port} | EA: ${eaId}</div>
          </div>

          <div class="main-content">
            <div id="view-desktop" class="grid-container">
              <div class="card-step" style="background: #fffdf0;">
                <div class="step-badge" style="background: #eab308;">1</div>
                <div style="font-weight:600; color:#854d0e;">สแกนชำระเงิน</div>
                <img src="data:image/png;base64,${qrData}" class="qr-image">
                <div><span class="timer-box">⏳ <span id="time">15:00</span></span></div>
                <div style="font-size:0.8rem; color:#a16207; margin-top:8px;">📌 กรุณาโอนภายในเวลา</div>
              </div>

              <div class="card-step" style="background: #f0fdf4;">
                <div class="step-badge" style="background: #22c55e;">2</div>
                <div style="font-weight:600; color:#166534;">แจ้งโอนเงินเพื่ออัพเดทวันอัตโนมัติ</div>
                <img src="${mobileQrLink}" class="qr-image">
                <div class="instruction-text">ใช้มือถือสแกนเพื่ออัปโหลดสลิป</div>
              </div>
            </div>

            <div id="view-mobile" class="hidden mobile-upload-ui">
              <h3 style="color: var(--primary); margin-top:0;">📤 ยืนยันการโอนเงิน</h3>
              <p style="font-size:0.9rem; color:#64748b;">กรุณาอัปโหลดสลิปยอด <b>${finalAmount.toFixed(2)}</b> บาท</p>
              
              <div style="border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; background: #f8fafc;">
                <input type="file" id="slipFile" accept="image/*" style="display:none;" onchange="handleFileSelect()">
                <div id="upload-placeholder" onclick="document.getElementById('slipFile').click()" style="cursor:pointer;">
                  <div style="font-size: 2.5rem; color: #cbd5e1;">📷</div>
                  <div style="color:var(--primary); font-weight:600;">เลือกรูปสลิปจากอัลบั้ม</div>
                </div>
                <div id="preview-area" class="hidden">
                   <p id="file-name" style="font-size: 0.85rem; color: var(--success);"></p>
                </div>
              </div>
              <button class="btn-upload hidden" id="btnUpload" onclick="uploadSlip()">ยืนยันและส่งข้อมูล</button>
            </div>
            
            <div style="text-align:center; margin-top:20px; font-size:0.8rem; color:#94a3b8;">
               ติดปัญหาติดต่อ Line: @479ufnya
            </div>
          </div>
        </div>

        <div id="success-card" class="container hidden" style="text-align: center; max-width: 450px; padding: 3rem 2rem;">
          <div style="font-size: 4rem; margin-bottom: 1rem;">✅</div>
          <h2 style="color: #15803d; margin: 0;">ชำระเงินสำเร็จ!</h2>
          <p style="color: #64748b;">ระบบต่ออายุ Port: <strong>${port}</strong> เรียบร้อยกรุณาปิดเปิด EA ใหม่อีกครั้ง</p>
          <button onclick="window.close()" class="btn-upload" style="background:#f1f5f9; color:#475569; margin-top:20px;">ปิดหน้าต่างนี้</button>
        </div>

        <script>
          const CURRENT_MODE = "${mode}"; 
          if (CURRENT_MODE === 'mobile') {
            document.getElementById('view-desktop').classList.add('hidden');
            document.getElementById('view-mobile').classList.remove('hidden');
            document.querySelector('.header-section').style.padding = '1.5rem 1rem';
          } else {
             setInterval(checkPayment, 5000); 
          }

          let timeLeft = 900;
          setInterval(() => {
            const timerEl = document.getElementById('time');
            if(timerEl) {
              let m = Math.floor(timeLeft / 60);
              let s = timeLeft % 60;
              timerEl.textContent = (m<10?'0':'')+m + ':' + (s<10?'0':'')+s;
              if (--timeLeft < 0) location.reload();
            }
          }, 1000);

          function checkPayment() {
            google.script.run.withSuccessHandler(function(isPaid) {
              if (isPaid) showSuccess();
            }).checkPaymentStatus("${port}", "${eaId}");
          }

          function handleFileSelect() {
            const file = document.getElementById('slipFile').files[0];
            if (file) {
              document.getElementById('upload-placeholder').classList.add('hidden');
              document.getElementById('btnUpload').classList.remove('hidden');
              document.getElementById('preview-area').classList.remove('hidden');
              document.getElementById('file-name').textContent = '✅ เลือกไฟล์แล้ว: ' + file.name;
            }
          }

          function uploadSlip() {
            const file = document.getElementById('slipFile').files[0];
            const btn = document.getElementById('btnUpload');
            btn.disabled = true;
            btn.textContent = '⏳ กำลังตรวจสอบ...';
            const reader = new FileReader();
            reader.onload = function(e) {
              const base64 = e.target.result.split(',')[1];
              google.script.run
                .withSuccessHandler((res) => { if(res.success) showSuccess(); else { alert(res.message); btn.disabled=false; btn.textContent='ยืนยันและส่งข้อมูล'; }})
                .processSlipUpload(base64, "${port}", "${eaId}", ${finalAmount});
            };
            reader.readAsDataURL(file);
          }

          function showSuccess() {
            document.getElementById('main-interface').classList.add('hidden');
            document.getElementById('success-card').classList.remove('hidden');
          }
        </script>
      </body>
    </html>
  `;
  return HtmlService.createHtmlOutput(html).addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// --- ส่วน Backend คงเดิมตามสคริปต์ที่คุณมี ---
function checkPaymentStatus(port, ea) {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS[0]);
  var tempSheet = ss.getSheetByName(CONFIG.SHEET_TEMP);
  var tempData = tempSheet.getDataRange().getValues();
  for(var i=0; i<tempData.length; i++) {
    if(tempData[i][1] == port && tempData[i][2] == ea) return false; 
  }
  return true; 
}

function processSlipUpload(base64Image, port, ea, expectedAmount) {
  try {
    var url = "https://developer.easyslip.com/api/v1/verify"; 
    var response = UrlFetchApp.fetch(url, {
      "method": "post",
      "contentType": "application/json",
      "headers": { "Authorization": "Bearer " + CONFIG.API_KEY },
      "payload": JSON.stringify({ "image": base64Image }),
      "muteHttpExceptions": true
    });
    var json = JSON.parse(response.getContentText());
    if (json.status !== 200) return { success: false, message: "สลิปผิดพลาด: " + json.message };
    
    var slipAmount = parseFloat(json.data.amount.amount);
    if (Math.abs(slipAmount - expectedAmount) > 0.05) return { success: false, message: "ยอดเงินไม่ตรง" };
    
    updateMainSheet(port, ea, slipAmount, daysToAdd);
    clearBooking(port, ea);
    return { success: true };
  } catch (e) { return { success: false, message: e.message }; }
}

function reserveSatang(port, ea) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { return null; }
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS[0]); 
  var sheet = ss.getSheetByName(CONFIG.SHEET_TEMP);
  var data = sheet.getDataRange().getValues();
  var now = new Date();
  var validRows = []; var usedSatangs = []; var existingBooking = null;
  for (var i = 0; i < data.length; i++) {
    if (data[i].length < 4) continue; 
    var rowTime = new Date(data[i][3]);
    if (now - rowTime < 15 * 60 * 1000) {
      validRows.push(data[i]);
      usedSatangs.push(parseFloat(data[i][0]));
      if (data[i][1] == port && data[i][2] == ea) existingBooking = parseFloat(data[i][0]);
    }
  }
  if (validRows.length < data.length) {
    sheet.clearContents();
    if (validRows.length > 0) sheet.getRange(1, 1, validRows.length, validRows[0].length).setValues(validRows);
  }
  if (existingBooking !== null) { lock.releaseLock(); return { satang: existingBooking }; }
  var availableSatangs = [];
  for (var k = 1; k <= 99; k++) {
    var val = parseFloat((k / 100).toFixed(2));
    if (usedSatangs.indexOf(val) === -1) availableSatangs.push(val);
  }
  var selectedSatang = null;
  if (availableSatangs.length > 0) {
    selectedSatang = availableSatangs[Math.floor(Math.random() * availableSatangs.length)];
    sheet.appendRow([selectedSatang, port, ea, new Date(), "PENDING"]);
  }
  lock.releaseLock();
  return selectedSatang !== null ? { satang: selectedSatang } : null;
}

function clearBooking(port, ea) {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS[0]);
  var sheet = ss.getSheetByName(CONFIG.SHEET_TEMP);
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 0; i--) {
    if (data[i][1] == port && data[i][2] == ea) sheet.deleteRow(i + 1);
  }
}

function generateMerchantQR(amount) {
  var url = "https://bill-payment-api.easyslip.com/"; 
  var payload = { "type": "PROMPTPAY", "msisdn": CONFIG.MY_PROMPTPAY, "amount": amount };
  var response = UrlFetchApp.fetch(url, { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload) });
  return JSON.parse(response.getContentText()).image_base64;
}

function updateMainSheet(targetPort, targetEa, amount, daysToAdd) { 
  CONFIG.SHEET_IDS.forEach(function(sheetId) {
    try {
      var ss = SpreadsheetApp.openById(sheetId);
      var sheet = ss.getSheetByName(CONFIG.SHEET_MAIN);
      var logSheet = ss.getSheetByName('log') || ss.insertSheet('log');
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] == targetPort && data[i][8] == targetEa) {
          var oldDateVal = data[i][2];
          var oldDateObj = (oldDateVal instanceof Date) ? oldDateVal : new Date(oldDateVal.toString().replace(/\./g, '/'));
          var now = new Date();
          var todayCheck = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          var oldDateCheck = new Date(oldDateObj.getFullYear(), oldDateObj.getMonth(), oldDateObj.getDate());
          var startDate = (oldDateCheck < todayCheck) ? now : oldDateObj;
          var newDateObj = new Date(startDate);
          newDateObj.setDate(newDateObj.getDate() + daysToAdd); 
          var newExpiryText = Utilities.formatDate(newDateObj, "GMT+7", "yyyy.MM.dd");
          sheet.getRange(i + 1, 3).setValue(newExpiryText);
          logSheet.appendRow([new Date(), targetPort, targetEa, oldDateVal, newExpiryText, amount, daysToAdd]);
          break;
        }
      }
    } catch (e) {}
  });
}