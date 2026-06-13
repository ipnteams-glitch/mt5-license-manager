// ==========================================
// ⚙️ ส่วนตั้งค่า
// ==========================================
const CONFIG = {
  BASE_PRICE: 500,       
  MY_PROMPTPAY: '0954149282', // เบอร์พร้อมเพย์
  API_KEY: '1588768d-0845-45d3-94d5-fc00d0c3067d', // API Key ของคุณ
  SHEET_ID: '1xyYSIFCo0On9neeQWisWre-wNl8z2JjpKpg7g_G4mI4', 
  SHEET_MAIN: 'acc',      
  SHEET_TEMP: 'temp_txn'
};

// ==========================================
// 1️⃣ สร้างหน้าเว็บ QR Code
// ==========================================
function doGet(e) {
  var port = e.parameter.port;
  var eaId = e.parameter.ea;

  if (!port || !eaId) return ContentService.createTextOutput("Error: Missing Port or EA ID");

  // จองเศษสตางค์
  var booking = reserveSatang(port, eaId);
  if (!booking) return ContentService.createTextOutput("Error: System Busy (Satang full)");

  var finalAmount = CONFIG.BASE_PRICE + booking.satang;

  // สร้าง QR Code (แบบ Merchant)
  try {
    var qrData = generateMerchantQR(finalAmount); // เรียกฟังก์ชันใหม่
    
    if (!qrData) throw new Error("EasySlip ไม่ส่งรูป QR กลับมา");

    // แสดงผล
    var html = `
      <html>
        <body style="text-align:center; font-family: sans-serif; padding-top: 40px; background-color: #f9f9f9;">
          <div style="background:white; padding:30px; border-radius:15px; box-shadow:0 4px 15px rgba(0,0,0,0.1); max-width:400px; margin:auto;">
            <h2 style="color:#333;">ชำระค่าบริการ</h2>
            <p>Port: <strong>${port}</strong> | EA: <strong>${eaId}</strong></p>
            <img src="data:image/png;base64,${qrData}" style="width:250px; border:2px solid #eee; margin:20px 0;">
            <h1 style="color:#0056b3;">${finalAmount.toFixed(2)} บาท</h1>
            <div style="background:#fff3cd; color:#856404; padding:10px; border-radius:5px; margin-top:15px;">
              ⚠️ <strong>สำคัญ:</strong> ต้องโอนยอดให้ตรงเศษสตางค์เป๊ะๆ
            </div>
          </div>
        </body>
      </html>
    `;
    return HtmlService.createHtmlOutput(html).addMetaTag('viewport', 'width=device-width, initial-scale=1');
    
  } catch (error) {
    return ContentService.createTextOutput("เกิดข้อผิดพลาด: " + error.message);
  }
}

// ==========================================
// 2️⃣ รับ Webhook (เช็คยอดเงิน)
// ==========================================
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var amount = 0;
    
    // รองรับโครงสร้าง Webhook ของ Merchant
    if (typeof data.amount === 'number') amount = data.amount;
    else if (data.data && data.data.amount) amount = data.data.amount; // บางทีส่งมาใน data

    if (amount > 0) {
      var receivedSatang = parseFloat((amount % 1).toFixed(2));
      var owner = findAndClearOwner(receivedSatang);

      if (owner) {
        updateMainSheet(owner.port, owner.ea);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({status: "success"}));
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status: "error"}));
  }
}

// ==========================================
// 🛠️ ฟังก์ชันเสริม (แก้ให้ตรงกับ Merchant API)
// ==========================================

function generateMerchantQR(amount) {
  // URL สำหรับบัญชีร้านค้า (Merchant) ตามรูปภาพของคุณ
  var url = "https://developer.easyslip.com/api/qr-payment/generate-qr-code"; 
  
  var payload = {
    "promptPayCode": CONFIG.MY_PROMPTPAY,
    "promptPayType": "phone_number", 
    "accountName": "Gold Scalping", 
    "amount": amount
  };
  
  var options = {
    "method": "post",
    "contentType": "application/json",
    "headers": { "Authorization": "Bearer " + CONFIG.API_KEY },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  var response = UrlFetchApp.fetch(url, options);
  var json = JSON.parse(response.getContentText());
  
  // เช็ค Error จาก EasySlip
  if (json.status !== 200) {
    throw new Error(json.message || JSON.stringify(json));
  }
  
  // ดึงรูป Base64
  return json.data.image_base64;
}

function reserveSatang(port, ea) {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_TEMP);
  var usedSatangs = sheet.getDataRange().getValues().map(r => r[0]); 
  
  for(var i=0; i<50; i++) {
    var satang = parseFloat((Math.random() * 0.99).toFixed(2));
    if(satang > 0 && usedSatangs.indexOf(satang) === -1) {
      sheet.appendRow([satang, port, ea, new Date()]);
      return { satang: satang };
    }
  }
  return null;
}

function findAndClearOwner(satang) {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_TEMP);
  var data = sheet.getDataRange().getValues();
  
  for (var i = 0; i < data.length; i++) {
    if (Math.abs(data[i][0] - satang) < 0.005) {
      var owner = { port: data[i][1], ea: data[i][2] };
      sheet.deleteRow(i + 1);
      return owner;
    }
  }
  return null;
}

function updateMainSheet(targetPort, targetEa) {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_MAIN);
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == targetPort && data[i][8] == targetEa) {
      var oldDateStr = data[i][2];
      var newDateObj = (oldDateStr instanceof Date) ? new Date(oldDateStr) : new Date(oldDateStr.toString().replace(/\./g, '/'));
      newDateObj.setMonth(newDateObj.getMonth() + 1);
      sheet.getRange(i + 1, 3).setValue(Utilities.formatDate(newDateObj, "GMT+7", "yyyy.MM.dd"));
      break; 
    }
  }
}
// ฟังก์ชันสำหรับกด Run เพื่อขออนุญาตสิทธิ์ (ใช้ครั้งเดียวแล้วลบได้)
function testAuthorization() {
  Logger.log("ขออนุญาตสำเร็จแล้ว!");
}





