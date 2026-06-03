const SHEET_NAME = "data"; 

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error("หาแท็บชื่อ '" + SHEET_NAME + "' ไม่เจอ");
    
    var data = JSON.parse(e.postData.contents);
    var acc_Number = String(data.acc_Number || data.acc_num || "");
    var nameEA = data.nameEA || data.name_ea || "-";
    var balance = data.balance || 0;
    var equity = data.equity || 0;
    var profit = data.profit || 0;
    var margin_lv = data.margin_lv || data.margin_level || 0;
    var profit7Day = data.profit7Day || data.profit7day || data.p7day || 0;
    var lastWeekProfit = data.lastWeekProfit || data.last_week_profit || 0;
    
    if (acc_Number === "") return ContentService.createTextOutput("Missing acc_Number");
    
    var rows = sheet.getDataRange().getValues();
    var foundRow = -1;
    
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === acc_Number.trim()) {
        foundRow = i + 1;
        break;
      }
    }
    
    if (foundRow > -1) {
      // 🎯 ล็อกเป้าหมายให้เขียนเฉพาะคอลัมน์ 4, 5, 6, 7 (D, E, F, G)
      // sheet.getRange(foundRow, 3).setValue(balance); // 🛑 ปิดการเขียน Balance ทับ (คอลัมน์ C)
      sheet.getRange(foundRow, 4).setValue(equity);     // คอลัมน์ D: equity
      sheet.getRange(foundRow, 5).setValue(profit);     // คอลัมน์ E: profit
      sheet.getRange(foundRow, 6).setValue(margin_lv);  // คอลัมน์ F: margin Lv.
      
      var sysName = sheet.getRange(foundRow, 2).getValue();


      if(String(sysName).trim() == 'Sys_7') {
         var cal = (parseFloat(profit7Day) / 6).toFixed(2);
         sheet.getRange(foundRow, 7).setValue(cal);    
         var cal1 = (parseFloat(profit) / 6).toFixed(2);
         sheet.getRange(foundRow, 5).setValue(cal1); 
      } else {
         sheet.getRange(foundRow, 7).setValue(profit7Day); // คอลัมน์ G: profit 7 day (อื่นๆ)
      }
      
      // ⭐ คอลัมน์ H: lastWeekProfit (สำหรับคำนวณดาว)
      sheet.getRange(foundRow, 8).setValue(lastWeekProfit);
      
    } else {
      // 🎯 ถ้าเป็นพอร์ตใหม่ ให้สร้างแถวใหม่แบบ 7 คอลัมน์เป๊ะๆ (ใส่ Balance ให้แค่ครั้งแรก)
      sheet.appendRow([acc_Number, nameEA, balance, equity, profit, margin_lv, profit7Day, lastWeekProfit]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
                           .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": error.toString()}))
                           .setMimeType(ContentService.MimeType.JSON);
  }
}
// ==========================================
// 2. ฟังก์ชันส่งข้อมูล JSON (อัปเดตให้รองรับทั้งหน้าเว็บเก่าและหน้าเว็บใหม่)
// ==========================================
// ==========================================
// 2. ฟังก์ชันส่งข้อมูล JSON (แก้ไข Error setHeader แล้ว)
// ==========================================
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var rows = sheet.getDataRange().getValues();
  var data = [];
  
  for (var i = 1; i < rows.length; i++) { 
    if(rows[i][0] !== "") {
      data.push({
        // --- ส่วนนี้สำหรับหน้า Index เดิม ---
        "acc_Number": rows[i][0],
        "equity": rows[i][3],
        "type": "Margin Level: " + Number(rows[i][5]).toFixed(2) + "%",
        "comment": "สัปดาห์นี้ทำกำไรแล้ว: $" + rows[i][6],
        
        // --- ส่วนนี้สำหรับหน้า RealTime แบบพรีเมียม ---
        "name": rows[i][1],        // คอลัมน์ B
        "balance": rows[i][2],     // คอลัมน์ C
        "profit": rows[i][4],      // คอลัมน์ E
        "margin_lv": rows[i][5],   // คอลัมน์ F
        "profit7day": rows[i][6],  // คอลัมน์ G
        "lastWeekProfit": rows[i][7] // คอลัมน์ H ⭐
      });
    }
  }
  
  // คืนค่า JSON กลับไปให้หน้าเว็บ โดยไม่ต้องใช้ setHeader
  return ContentService.createTextOutput(JSON.stringify(data))
                       .setMimeType(ContentService.MimeType.JSON);
}