/**
 * VC Gurukul Practice App - Content Validation Engine
 * Deployed under Phase 1.
 * 
 * Audits questions, topics, chapters, and rubrics for data integrity.
 * Invalid records are flagged and logged to the Import_Errors sheet.
 */

function menuValidateContent() {
  var ui = SpreadsheetApp.getUi();
  ui.showModelessDialog(
    HtmlService.createHtmlOutput("<div style='font-family:sans-serif;padding:20px;'><h3>Validating Content...</h3><p>Please wait while the validation checks are executed.</p></div>")
      .setWidth(300).setHeight(150),
    "Validation Status"
  );
  
  var errors = validateContent();
  
  // Close dialog and show summary
  var responseHtml = "";
  if (errors.length === 0) {
    ui.alert("Validation Clean", "Hurrah! All chapters, topics, MCQs, and SM questions passed validation successfully.", ui.ButtonSet.OK);
  } else {
    var errorMsg = "Validation failed with " + errors.length + " issues. Details have been logged to the 'Import_Errors' sheet.\n\nSummary of first few errors:\n";
    var limit = Math.min(errors.length, 5);
    for (var i = 0; i < limit; i++) {
      errorMsg += "- Row " + errors[i].row_index + " (" + errors[i].sheet + "): " + errors[i].error_message + "\n";
    }
    if (errors.length > 5) {
      errorMsg += "...and " + (errors.length - 5) + " more.";
    }
    ui.alert("Validation Issues Found", errorMsg, ui.ButtonSet.OK);
  }
}

function validateContent() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var errors = [];
  var timestamp = new Date();
  
  // 1. Gather all Topic IDs & Chapter IDs
  var chaptersSheet = ss.getSheetByName("Chapters");
  var chData = chaptersSheet.getDataRange().getValues();
  var activeChapterIds = {};
  for (var i = 1; i < chData.length; i++) {
    var cid = chData[i][0].toString().trim();
    if (cid) {
      activeChapterIds[cid] = chData[i][5].toString().toLowerCase() === "true"; // Map ID -> active status
    }
  }
  
  var topicsSheet = ss.getSheetByName("Topics");
  var tpData = topicsSheet.getDataRange().getValues();
  var activeTopicIds = {};
  for (var i = 1; i < tpData.length; i++) {
    var tid = tpData[i][0].toString().trim();
    var parentChId = tpData[i][1].toString().trim();
    
    if (tid) {
      activeTopicIds[tid] = {
        is_active: tpData[i][4].toString().toLowerCase() === "true",
        chapter_id: parentChId
      };
      
      // Topic references non-existent Chapter ID
      if (parentChId && !activeChapterIds.hasOwnProperty(parentChId)) {
        errors.push({
          sheet: "Topics",
          row_index: i + 1,
          error_message: "Topic references a non-existent chapter_id: '" + parentChId + "'"
        });
      }
    }
  }
  
  // Track Q_IDs globally to check for duplicates
  var globalQIds = {};
  
  // 2. Validate MCQ Questions
  var mcqSheet = ss.getSheetByName("MCQ_Questions");
  var mcqData = mcqSheet.getDataRange().getValues();
  var mcqHeaders = mcqData[0];
  
  for (var i = 1; i < mcqData.length; i++) {
    var row = mcqData[i];
    var qObj = {};
    for (var j = 0; j < mcqHeaders.length; j++) {
      qObj[mcqHeaders[j]] = row[j];
    }
    
    var qId = (qObj.q_id || "").toString().trim();
    if (!qId) continue;
    
    // Check Duplicate q_id
    if (globalQIds[qId]) {
      errors.push({
        sheet: "MCQ_Questions",
        row_index: i + 1,
        error_message: "Duplicate q_id detected: '" + qId + "'"
      });
    } else {
      globalQIds[qId] = "MCQ";
    }
    
    // Check Topic ID reference
    var topicId = (qObj.topic_id || "").toString().trim();
    if (!topicId || !activeTopicIds.hasOwnProperty(topicId)) {
      errors.push({
        sheet: "MCQ_Questions",
        row_index: i + 1,
        error_message: "Question '" + qId + "' references non-existent or blank topic_id: '" + topicId + "'"
      });
    }
    
    // Check Chapter ID reference
    var chId = (qObj.chapter_id || "").toString().trim();
    if (!chId || !activeChapterIds.hasOwnProperty(chId)) {
      errors.push({
        sheet: "MCQ_Questions",
        row_index: i + 1,
        error_message: "Question '" + qId + "' references non-existent or blank chapter_id: '" + chId + "'"
      });
    }
    
    // Check Correct Option validity (must be A, B, C, D)
    var correctOpt = (qObj.correct_option || "").toString().trim().toUpperCase();
    if (!correctOpt || ["A", "B", "C", "D"].indexOf(correctOpt) === -1) {
      errors.push({
        sheet: "MCQ_Questions",
        row_index: i + 1,
        error_message: "Question '" + qId + "' has missing or invalid correct_option: '" + correctOpt + "' (must be A, B, C, or D)"
      });
    }
    
    // Check Blank Options
    if ((qObj.option_a || "").toString().trim() === "") {
      errors.push({ sheet: "MCQ_Questions", row_index: i + 1, error_message: "Question '" + qId + "' has a blank option_a" });
    }
    if ((qObj.option_b || "").toString().trim() === "") {
      errors.push({ sheet: "MCQ_Questions", row_index: i + 1, error_message: "Question '" + qId + "' has a blank option_b" });
    }
    if ((qObj.option_c || "").toString().trim() === "") {
      errors.push({ sheet: "MCQ_Questions", row_index: i + 1, error_message: "Question '" + qId + "' has a blank option_c" });
    }
    if ((qObj.option_d || "").toString().trim() === "") {
      errors.push({ sheet: "MCQ_Questions", row_index: i + 1, error_message: "Question '" + qId + "' has a blank option_d" });
    }
  }
  
  // 3. Validate SM Questions
  var smSheet = ss.getSheetByName("SM_Questions");
  var smData = smSheet.getDataRange().getValues();
  var smHeaders = smData[0];
  var smQuestionsMap = {};
  
  for (var i = 1; i < smData.length; i++) {
    var row = smData[i];
    var qObj = {};
    for (var j = 0; j < smHeaders.length; j++) {
      qObj[smHeaders[j]] = row[j];
    }
    
    var qId = (qObj.q_id || "").toString().trim();
    if (!qId) continue;
    
    // Check Duplicate q_id (including cross MCQ checking)
    if (globalQIds[qId]) {
      errors.push({
        sheet: "SM_Questions",
        row_index: i + 1,
        error_message: "Duplicate q_id detected: '" + qId + "' (already registered as " + globalQIds[qId] + ")"
      });
    } else {
      globalQIds[qId] = "SM";
    }
    
    smQuestionsMap[qId] = {
      marks: Number(qObj.marks) || 0,
      row_index: i + 1,
      has_rubric: false,
      rubric_total_marks: 0.0,
      has_model_answer: false
    };
    
    // Check Topic ID reference
    var topicId = (qObj.topic_id || "").toString().trim();
    if (!topicId || !activeTopicIds.hasOwnProperty(topicId)) {
      errors.push({
        sheet: "SM_Questions",
        row_index: i + 1,
        error_message: "SM Question '" + qId + "' references non-existent or blank topic_id: '" + topicId + "'"
      });
    }
  }
  
  // 4. Validate SM Rubric Points
  var rubricSheet = ss.getSheetByName("SM_Rubric_Points");
  var rData = rubricSheet.getDataRange().getValues();
  var rHeaders = rData[0];
  
  for (var i = 1; i < rData.length; i++) {
    var row = rData[i];
    var rObj = {};
    for (var j = 0; j < rHeaders.length; j++) {
      rObj[rHeaders[j]] = row[j];
    }
    
    var qId = (rObj.q_id || "").toString().trim();
    var pointId = (rObj.point_id || "").toString().trim();
    var marks = Number(rObj.marks) || 0;
    
    if (!qId) continue;
    
    // Check if rubric references a valid SM question
    if (!smQuestionsMap.hasOwnProperty(qId)) {
      errors.push({
        sheet: "SM_Rubric_Points",
        row_index: i + 1,
        error_message: "Rubric '" + pointId + "' references a non-existent SM question ID: '" + qId + "'"
      });
    } else {
      smQuestionsMap[qId].has_rubric = true;
      smQuestionsMap[qId].rubric_total_marks += marks;
    }
    
    // Rubric details validation
    if (!pointId) {
      errors.push({
        sheet: "SM_Rubric_Points",
        row_index: i + 1,
        error_message: "Rubric point has empty point_id."
      });
    }
    if ((rObj.point_summary || "").toString().trim() === "") {
      errors.push({
        sheet: "SM_Rubric_Points",
        row_index: i + 1,
        error_message: "Rubric '" + pointId + "' has empty point_summary."
      });
    }
  }
  
  // 5. Validate SM Model Answers
  var modelAnsSheet = ss.getSheetByName("SM_Model_Answers");
  var mData = modelAnsSheet.getDataRange().getValues();
  
  for (var i = 1; i < mData.length; i++) {
    var qId = mData[i][0].toString().trim();
    var ansText = mData[i][1].toString().trim();
    
    if (!qId) continue;
    
    if (!smQuestionsMap.hasOwnProperty(qId)) {
      errors.push({
        sheet: "SM_Model_Answers",
        row_index: i + 1,
        error_message: "Model answer references a non-existent SM question ID: '" + qId + "'"
      });
    } else {
      if (ansText === "") {
        errors.push({
          sheet: "SM_Model_Answers",
          row_index: i + 1,
          error_message: "Model answer for question '" + qId + "' is empty."
        });
      } else {
        smQuestionsMap[qId].has_model_answer = true;
      }
    }
  }
  
  // 6. Post-process SM Questions (Check total marks and missing linkages)
  for (var qId in smQuestionsMap) {
    var qInfo = smQuestionsMap[qId];
    
    // Check if has no rubric points
    if (!qInfo.has_rubric) {
      errors.push({
        sheet: "SM_Questions",
        row_index: qInfo.row_index,
        error_message: "SM Question '" + qId + "' has no registered rubric points."
      });
    } else {
      // Check if rubric points do not sum to total question marks
      if (Math.abs(qInfo.rubric_total_marks - qInfo.marks) > 0.01) {
        errors.push({
          sheet: "SM_Questions",
          row_index: qInfo.row_index,
          error_message: "SM Question '" + qId + "' marks (" + qInfo.marks + ") do not equal the sum of rubric point marks (" + qInfo.rubric_total_marks + ")."
        });
      }
    }
    
    // Check if has no model answer
    if (!qInfo.has_model_answer) {
      errors.push({
        sheet: "SM_Questions",
        row_index: qInfo.row_index,
        error_message: "SM Question '" + qId + "' has no registered model answer."
      });
    }
  }
  
  // 7. Write all validation errors to the Import_Errors sheet
  var errSheet = ss.getSheetByName("Import_Errors");
  // Keep headers but clear the rest
  if (errSheet.getLastRow() > 1) {
    errSheet.getRange(2, 1, errSheet.getLastRow() - 1, 3).clearContent();
  }
  
  if (errors.length > 0) {
    var writeRows = [];
    for (var k = 0; k < errors.length; k++) {
      writeRows.push([
        timestamp,
        "Row " + errors[k].row_index + " (" + errors[k].sheet + ")",
        errors[k].error_message
      ]);
    }
    errSheet.getRange(2, 1, writeRows.length, 3).setValues(writeRows);
    errSheet.autoResizeColumns(1, 3);
  }
  
  return errors;
}

/**
 * Filter utility for other API handlers: checks if question ID is clean
 */
function isQuestionValid(qId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var errSheet = ss.getSheetByName("Import_Errors");
  var errData = errSheet.getDataRange().getValues();
  
  for (var i = 1; i < errData.length; i++) {
    var detail = errData[i][1].toString();
    var msg = errData[i][2].toString();
    if (msg.indexOf("Question '" + qId + "'") !== -1 || msg.indexOf("SM Question '" + qId + "'") !== -1) {
      return false; // Question failed validation, exclude from delivery
    }
  }
  return true;
}
