/**
 * VC Gurukul Practice App - Web App Core API Handler
 * Deployed under Phase 1.
 * 
 * Provides HTTP doGet and doPost endpoints for student interaction, database writing, and administrative tasks.
 */

// Helper to create response with CORS headers
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Token validation helper
function validateToken(e) {
  var requestToken = e.parameter.app_token || (e.postData && JSON.parse(e.postData.contents).app_token);
  var scriptProperties = PropertiesService.getScriptProperties();
  var appToken = scriptProperties.getProperty("app_token");
  
  // Set default if not exists
  if (!appToken) {
    appToken = "vcg_secret_123_change_me";
    scriptProperties.setProperty("app_token", appToken);
  }
  
  if (!requestToken || requestToken !== appToken) {
    throw new Error("Unauthorized access. Invalid or missing app_token.");
  }
}

/**
 * Handle GET requests
 */
function doGet(e) {
  try {
    validateToken(e);
    
    var action = e.parameter.action;
    if (!action) {
      return jsonResponse({ status: "error", message: "Missing action parameter" });
    }
    
    switch (action) {
      case "getConfig":
        return jsonResponse(apiGetConfig());
      case "getChapters":
        var subject = e.parameter.subject; // "QUANT" or "SM"
        return jsonResponse(apiGetChapters(subject));
      case "getMcqQuestions":
        var chapterId = e.parameter.chapter_id;
        var topicId = e.parameter.topic_id;
        var mode = e.parameter.mode;
        var studentId = e.parameter.student_id;
        return jsonResponse(apiGetMcqQuestions(chapterId, topicId, mode, studentId));
      case "getSmQuestion":
        var qId = e.parameter.q_id;
        var chapterId = e.parameter.chapter_id;
        var topicId = e.parameter.topic_id;
        return jsonResponse(apiGetSmQuestion(qId, chapterId, topicId));
      default:
        return jsonResponse({ status: "error", message: "Unknown GET action: " + action });
    }
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * Handle POST requests
 */
function doPost(e) {
  try {
    validateToken(e);
    
    if (!e.postData || !e.postData.contents) {
      return jsonResponse({ status: "error", message: "Missing request body" });
    }
    
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    if (!action) {
      return jsonResponse({ status: "error", message: "Missing action parameter in payload" });
    }
    
    switch (action) {
      case "registerStudent":
        return jsonResponse(apiRegisterStudent(payload));
      case "submitMcqTest":
        return jsonResponse(apiSubmitMcqTest(payload));
      case "submitSmAnswer":
        return jsonResponse(apiSubmitSmAnswer(payload));
      case "saveSmSelfScore":
        return jsonResponse(apiSaveSmSelfScore(payload));
      case "getMyProgress":
        return jsonResponse(apiGetMyProgress(payload.student_id));
      default:
        return jsonResponse({ status: "error", message: "Unknown POST action: " + action });
    }
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * Custom Menu Creation
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("VC Gurukul")
    .addItem("Validate Content", "menuValidateContent")
    .addItem("Refresh Dashboard", "menuRefreshDashboard")
    .addItem("Export CSV to Drive", "menuExportCsv")
    .addItem("Deploy Check", "menuDeployCheck")
    .addToUi();
}

/**
 * GET Actions Handlers
 */

function apiGetConfig() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("app_config");
  if (cached) {
    return { status: "success", data: JSON.parse(cached) };
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Config");
  var data = sheet.getDataRange().getValues();
  var config = {};
  
  for (var i = 1; i < data.length; i++) {
    var key = data[i][0];
    var val = data[i][1];
    if (key) {
      config[key] = val;
    }
  }
  
  // Cache config for 6 hours
  try {
    cache.put("app_config", JSON.stringify(config), 21600);
  } catch (e) {
    // Fail silently if cache write fails
  }
  
  return { status: "success", data: config };
}

function apiGetChapters(subject) {
  var cacheKey = "chapters_" + (subject || "all");
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey);
  if (cached) {
    return { status: "success", data: JSON.parse(cached) };
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Load Chapters
  var chaptersSheet = ss.getSheetByName("Chapters");
  var chData = chaptersSheet.getDataRange().getValues();
  var chapters = [];
  var chHeaders = chData[0];
  
  for (var i = 1; i < chData.length; i++) {
    var row = chData[i];
    var chObj = {};
    for (var j = 0; j < chHeaders.length; j++) {
      chObj[chHeaders[j]] = row[j];
    }
    
    // Filter by subject and active status
    if (chObj.is_active.toString().toLowerCase() === "true") {
      if (!subject || chObj.subject === subject) {
        chObj.topics = [];
        chapters.push(chObj);
      }
    }
  }
  
  // Load Topics
  var topicsSheet = ss.getSheetByName("Topics");
  var tpData = topicsSheet.getDataRange().getValues();
  var tpHeaders = tpData[0];
  
  for (var i = 1; i < tpData.length; i++) {
    var row = tpData[i];
    var tpObj = {};
    for (var j = 0; j < tpHeaders.length; j++) {
      tpObj[tpHeaders[j]] = row[j];
    }
    
    if (tpObj.is_active.toString().toLowerCase() === "true") {
      // Find parent chapter and append
      for (var k = 0; k < chapters.length; k++) {
        if (chapters[k].chapter_id === tpObj.chapter_id) {
          chapters[k].topics.push(tpObj);
          break;
        }
      }
    }
  }
  
  // Sort topics within chapters by sequence
  for (var k = 0; k < chapters.length; k++) {
    chapters[k].topics.sort(function(a, b) {
      return Number(a.sequence) - Number(b.sequence);
    });
  }
  
  try {
    cache.put(cacheKey, JSON.stringify(chapters), 21600); // 6 hours
  } catch (e) {}
  
  return { status: "success", data: chapters };
}

function apiGetMcqQuestions(chapterId, topicId, mode, studentId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mcqSheet = ss.getSheetByName("MCQ_Questions");
  var data = mcqSheet.getDataRange().getValues();
  var headers = data[0];
  var questions = [];
  
  // Filter parameters
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var qObj = {};
    for (var j = 0; j < headers.length; j++) {
      qObj[headers[j]] = row[j];
    }
    
    if (qObj.is_active.toString().toLowerCase() !== "true") {
      continue;
    }
    
    if (chapterId && qObj.chapter_id !== chapterId) continue;
    if (topicId && qObj.topic_id !== topicId) continue;
    
    // STRIP OUT answer keys and solutions for student delivery
    delete qObj.correct_option;
    delete qObj.solution_steps;
    delete qObj.distractor_a_note;
    delete qObj.distractor_b_note;
    delete qObj.distractor_c_note;
    delete qObj.distractor_d_note;
    
    questions.push(qObj);
  }
  
  // Dynamic mode sorting/slicing
  if (mode === "Topic Drill") {
    questions = questions.slice(0, 10); // Standard limit
  } else if (mode === "Chapter Test") {
    shuffleArray(questions);
    questions = questions.slice(0, 25);
  } else if (mode === "Speed Drill") {
    shuffleArray(questions);
    questions = questions.slice(0, 20);
  } else if (mode === "Full Mock") {
    var mockCount = Number(getConfigValue("mock_question_count")) || 100;
    shuffleArray(questions);
    questions = questions.slice(0, mockCount);
  } else if (mode === "Weak Area" && studentId) {
    // Auto-pick worst performing questions for the student
    questions = getWeakAreaQuestions(questions, studentId);
  } else if (mode === "Retry Wrong" && studentId) {
    questions = getRetryWrongQuestions(questions, studentId);
  }
  
  return { status: "success", data: questions };
}

function apiGetSmQuestion(qId, chapterId, topicId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var smSheet = ss.getSheetByName("SM_Questions");
  var data = smSheet.getDataRange().getValues();
  var headers = data[0];
  var matchedQuestions = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var qObj = {};
    for (var j = 0; j < headers.length; j++) {
      qObj[headers[j]] = row[j];
    }
    
    if (qObj.is_active.toString().toLowerCase() !== "true") continue;
    
    if (qId && qObj.q_id === qId) {
      matchedQuestions.push(qObj);
      break;
    }
    if (chapterId && qObj.chapter_id !== chapterId) continue;
    if (topicId && qObj.topic_id !== topicId) continue;
    
    matchedQuestions.push(qObj);
  }
  
  if (matchedQuestions.length === 0) {
    return { status: "error", message: "No active Strategic Management questions found matching criteria." };
  }
  
  // Pick one randomly if multiple matched
  var question = matchedQuestions[Math.floor(Math.random() * matchedQuestions.length)];
  
  // Strip out rubrics/model answer components (never returned before submission)
  return { status: "success", data: question };
}

/**
 * POST Actions Handlers
 */

function apiRegisterStudent(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); // 20s timeout
  } catch (e) {
    return { status: "error", message: "Server busy. Please try again." };
  }
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Students");
    var data = sheet.getDataRange().getValues();
    var phone = payload.phone.toString().trim();
    
    if (!phone) {
      return { status: "error", message: "Phone number is required." };
    }
    
    var headers = data[0];
    var phoneIdx = headers.indexOf("phone");
    var studentIdIdx = headers.indexOf("student_id");
    
    var studentId = "";
    var existingRowIdx = -1;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][phoneIdx].toString().trim() === phone) {
        studentId = data[i][studentIdIdx];
        existingRowIdx = i + 1; // 1-indexed for sheets
        break;
      }
    }
    
    var now = new Date();
    
    if (existingRowIdx !== -1) {
      // Upsert/Update student info
      sheet.getRange(existingRowIdx, headers.indexOf("name") + 1).setValue(payload.name);
      sheet.getRange(existingRowIdx, headers.indexOf("email") + 1).setValue(payload.email || "");
      sheet.getRange(existingRowIdx, headers.indexOf("city") + 1).setValue(payload.city || "");
      sheet.getRange(existingRowIdx, headers.indexOf("level") + 1).setValue(payload.level || "Foundation");
      sheet.getRange(existingRowIdx, headers.indexOf("batch_code") + 1).setValue(payload.batch_code || "");
      sheet.getRange(existingRowIdx, headers.indexOf("last_seen") + 1).setValue(now);
    } else {
      // Create new unique student ID
      studentId = "std_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);
      var newRow = [];
      for (var j = 0; j < headers.length; j++) {
        var col = headers[j];
        if (col === "student_id") newRow.push(studentId);
        else if (col === "name") newRow.push(payload.name);
        else if (col === "phone") newRow.push(phone);
        else if (col === "email") newRow.push(payload.email || "");
        else if (col === "city") newRow.push(payload.city || "");
        else if (col === "level") newRow.push(payload.level || "Foundation");
        else if (col === "batch_code") newRow.push(payload.batch_code || "");
        else if (col === "first_seen") newRow.push(now);
        else if (col === "last_seen") newRow.push(now);
        else if (col === "total_attempts") newRow.push(0);
        else newRow.push("");
      }
      sheet.appendRow(newRow);
    }
    
    return { status: "success", student_id: studentId };
  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function apiSubmitMcqTest(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (e) {
    return { status: "error", message: "Database lock timeout. Try submitting again." };
  }
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Load config parameters
    var marksPerCorrect = Number(getConfigValue("marks_per_correct")) || 1.0;
    var negMarksPerWrong = Number(getConfigValue("negative_marks_per_wrong")) || 0.25;
    var optionsPerQ = Number(getConfigValue("options_per_question")) || 4.0;
    
    var mcqSheet = ss.getSheetByName("MCQ_Questions");
    var qData = mcqSheet.getDataRange().getValues();
    var qHeaders = qData[0];
    
    // Create mapping of q_id to answer details
    var qMap = {};
    for (var i = 1; i < qData.length; i++) {
      var row = qData[i];
      var q = {};
      for (var j = 0; j < qHeaders.length; j++) {
        q[qHeaders[j]] = row[j];
      }
      qMap[q.q_id] = q;
    }
    
    var responses = payload.responses || []; // array of {q_id, selected_option, time_taken_sec}
    var attemptId = "att_mcq_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);
    
    var total_q = responses.length;
    var attempted = 0;
    var correct = 0;
    var wrong = 0;
    var skipped = 0;
    var total_time = 0;
    
    var detailedResponses = [];
    var errorDNA = {
      "Calculation Error": 0,
      "Formula Confusion": 0,
      "Concept Gap": 0,
      "Trap Fell": 0,
      "Other": 0
    };
    
    var responseRows = [];
    
    for (var k = 0; k < responses.length; k++) {
      var r = responses[k];
      var qInfo = qMap[r.q_id];
      if (!qInfo) continue;
      
      var selected = (r.selected_option || "").toString().trim().toUpperCase();
      var correctOpt = (qInfo.correct_option || "").toString().trim().toUpperCase();
      var timeSec = Number(r.time_taken_sec) || 0;
      total_time += timeSec;
      
      var isCorrect = false;
      var status = "skipped";
      
      if (selected === "") {
        skipped++;
      } else {
        attempted++;
        if (selected === correctOpt) {
          correct++;
          isCorrect = true;
          status = "correct";
        } else {
          wrong++;
          status = "wrong";
          
          // Categorize error based on selected distractor note
          var note = "";
          if (selected === "A") note = qInfo.distractor_a_note;
          else if (selected === "B") note = qInfo.distractor_b_note;
          else if (selected === "C") note = qInfo.distractor_c_note;
          else if (selected === "D") note = qInfo.distractor_d_note;
          
          note = (note || "").toLowerCase();
          if (note.indexOf("calculation") !== -1 || note.indexOf("math") !== -1) {
            errorDNA["Calculation Error"]++;
          } else if (note.indexOf("formula") !== -1 || note.indexOf("equation") !== -1) {
            errorDNA["Formula Confusion"]++;
          } else if (note.indexOf("trap") !== -1 || note.indexOf("misread") !== -1) {
            errorDNA["Trap Fell"]++;
          } else if (note.indexOf("concept") !== -1 || note.indexOf("theory") !== -1) {
            errorDNA["Concept Gap"]++;
          } else {
            errorDNA["Other"]++;
          }
        }
      }
      
      // Save details for client response
      detailedResponses.push({
        q_id: r.q_id,
        question_text: qInfo.question_text,
        option_a: qInfo.option_a,
        option_b: qInfo.option_b,
        option_c: qInfo.option_c,
        option_d: qInfo.option_d,
        selected_option: selected,
        correct_option: correctOpt,
        is_correct: isCorrect,
        solution_steps: qInfo.solution_steps,
        distractor_notes: {
          A: qInfo.distractor_a_note,
          B: qInfo.distractor_b_note,
          C: qInfo.distractor_c_note,
          D: qInfo.distractor_d_note
        },
        time_taken_sec: timeSec
      });
      
      // Prepare MCQ_Responses row
      responseRows.push([
        attemptId, r.q_id, selected, correctOpt, isCorrect ? "true" : "false", timeSec
      ]);
    }
    
    // Scoring Math
    var score = (correct * marksPerCorrect) - (wrong * negMarksPerWrong);
    var maxScore = total_q * marksPerCorrect;
    var accuracy = attempted > 0 ? (correct / attempted) : 0;
    
    // Strategy Analyser EV calculation
    var blindGuessEV = (1.0 / optionsPerQ * marksPerCorrect) - ((optionsPerQ - 1.0) / optionsPerQ * negMarksPerWrong);
    var unclaimedMarks = skipped * blindGuessEV;
    var guessVerdict = "";
    
    if (skipped > (total_q * 0.3)) {
      if (blindGuessEV > 0) {
        guessVerdict = "You skipped " + skipped + " questions. EV of a blind guess = +" + blindGuessEV.toFixed(4) + " marks. Estimated marks left unclaimed: " + unclaimedMarks.toFixed(2) + ". Verdict: under this marking scheme, guessing beats leaving blanks. You are over-skipping.";
      } else {
        guessVerdict = "You skipped " + skipped + " questions. Guessing penalty is steep. Your risk-averse strategy is mathematically justified under negative marking.";
      }
    } else if (wrong > (total_q * 0.4)) {
      guessVerdict = "High error count detected. Ensure you are not rushing or guessing blindly without eliminating options first.";
    } else {
      guessVerdict = "Healthy balance of attempts and risk-taking.";
    }
    
    // Save to MCQ_Attempts
    var errorTagSummary = JSON.stringify(errorDNA);
    var attemptsSheet = ss.getSheetByName("MCQ_Attempts");
    var now = new Date();
    
    attemptsSheet.appendRow([
      attemptId, 
      payload.student_id, 
      payload.name || "Unknown Student", 
      payload.mode || "Topic Drill", 
      payload.chapter_id || "All", 
      payload.started_at ? new Date(payload.started_at) : now, 
      now, 
      total_q, 
      attempted, 
      correct, 
      wrong, 
      skipped, 
      score, 
      maxScore, 
      accuracy, 
      total_time, 
      errorTagSummary
    ]);
    
    // Save Responses in batch
    if (responseRows.length > 0) {
      var respSheet = ss.getSheetByName("MCQ_Responses");
      var nextRow = respSheet.getLastRow() + 1;
      respSheet.getRange(nextRow, 1, responseRows.length, 6).setValues(responseRows);
    }
    
    // Increment student total attempts
    incrementStudentAttempt(payload.student_id);
    
    return {
      status: "success",
      attempt_id: attemptId,
      score: score,
      max_score: maxScore,
      accuracy_pct: accuracy * 100,
      attempted: attempted,
      correct: correct,
      wrong: wrong,
      skipped: skipped,
      time_taken_sec: total_time,
      guess_analysis: guessVerdict,
      error_dna: errorDNA,
      responses: detailedResponses
    };
    
  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function apiSubmitSmAnswer(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (e) {
    return { status: "error", message: "Database lock timeout. Try submitting again." };
  }
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var attemptId = "att_sm_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);
    
    var qId = payload.q_id;
    var answerText = payload.answer_text || "";
    var wordCount = countWords(answerText);
    
    // Retrieve Question Marks
    var smSheet = ss.getSheetByName("SM_Questions");
    var qData = smSheet.getDataRange().getValues();
    var marksPossible = 5.0;
    for (var i = 1; i < qData.length; i++) {
      if (qData[i][0] === qId) {
        marksPossible = Number(qData[i][4]) || 5.0;
        break;
      }
    }
    
    // Retrieve Rubrics
    var rubricSheet = ss.getSheetByName("SM_Rubric_Points");
    var rData = rubricSheet.getDataRange().getValues();
    var rubricHeaders = rData[0];
    var rubricPoints = [];
    
    for (var i = 1; i < rData.length; i++) {
      if (rData[i][1] === qId) {
        var pt = {};
        for (var j = 0; j < rubricHeaders.length; j++) {
          pt[rubricHeaders[j]] = rData[i][j];
        }
        rubricPoints.push(pt);
      }
    }
    
    // Retrieve Model Answer
    var modelAnsSheet = ss.getSheetByName("SM_Model_Answers");
    var mData = modelAnsSheet.getDataRange().getValues();
    var modelAnswerText = "Model answer not uploaded yet.";
    var sourceRef = "";
    
    for (var i = 1; i < mData.length; i++) {
      if (mData[i][0] === qId) {
        modelAnswerText = mData[i][1];
        sourceRef = mData[i][2];
        break;
      }
    }
    
    // Run assistive keyword highlighting
    var evaluatedPoints = rubricPoints.map(function(pt) {
      var kwList = (pt.keywords || "").split(",").map(function(k) { return k.trim().toLowerCase(); });
      var foundKeywords = [];
      var missingKeywords = [];
      
      kwList.forEach(function(kw) {
        if (!kw) return;
        if (answerText.toLowerCase().indexOf(kw) !== -1) {
          foundKeywords.push(kw);
        } else {
          missingKeywords.push(kw);
        }
      });
      
      return {
        point_id: pt.point_id,
        point_no: pt.point_no,
        marks: pt.marks,
        point_summary: pt.point_summary,
        keywords: kwList,
        found_keywords: foundKeywords,
        missing_keywords: missingKeywords,
        is_suggested_match: foundKeywords.length > 0
      };
    });
    
    // Append to SM_Attempts (self_score, points_covered, etc. will be populated later)
    var smAttemptsSheet = ss.getSheetByName("SM_Attempts");
    smAttemptsSheet.appendRow([
      attemptId,
      payload.student_id,
      payload.name || "Unknown Student",
      qId,
      payload.chapter_id || "All",
      marksPossible,
      "", // self_score (pending evaluation)
      wordCount,
      "", // points_covered (pending)
      "", // points_missed (pending)
      "", // keywords_missed (pending)
      Number(payload.time_taken_sec) || 0,
      answerText,
      new Date(),
      0 // inflation_flag_count (updated in saveSmSelfScore)
    ]);
    
    incrementStudentAttempt(payload.student_id);
    
    return {
      status: "success",
      attempt_id: attemptId,
      marks_possible: marksPossible,
      rubric_points: evaluatedPoints,
      model_answer: modelAnswerText,
      source_ref: sourceRef,
      word_count: wordCount
    };
    
  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function apiSaveSmSelfScore(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (e) {
    return { status: "error", message: "Database lock timeout." };
  }
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("SM_Attempts");
    var data = sheet.getDataRange().getValues();
    
    var attemptId = payload.attempt_id;
    var headers = data[0];
    
    var attemptIdIdx = headers.indexOf("attempt_id");
    var rowIdx = -1;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][attemptIdIdx] === attemptId) {
        rowIdx = i + 1;
        break;
      }
    }
    
    if (rowIdx === -1) {
      return { status: "error", message: "SM Attempt ID not found: " + attemptId };
    }
    
    // Update columns
    sheet.getRange(rowIdx, headers.indexOf("self_score") + 1).setValue(payload.self_score);
    sheet.getRange(rowIdx, headers.indexOf("points_covered") + 1).setValue(JSON.stringify(payload.points_covered || []));
    sheet.getRange(rowIdx, headers.indexOf("points_missed") + 1).setValue(JSON.stringify(payload.points_missed || []));
    sheet.getRange(rowIdx, headers.indexOf("keywords_missed") + 1).setValue(JSON.stringify(payload.keywords_missed || []));
    sheet.getRange(rowIdx, headers.indexOf("inflation_flag_count") + 1).setValue(Number(payload.inflation_flag_count) || 0);
    
    return { status: "success", message: "Self score saved successfully." };
  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function apiGetMyProgress(studentId) {
  if (!studentId) {
    return { status: "error", message: "Missing student_id parameter." };
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // MCQ history
  var mcqSheet = ss.getSheetByName("MCQ_Attempts");
  var mcqData = mcqSheet.getDataRange().getValues();
  var mcqHeaders = mcqData[0];
  var mcqAttempts = [];
  
  var mStdIdIdx = mcqHeaders.indexOf("student_id");
  for (var i = 1; i < mcqData.length; i++) {
    if (mcqData[i][mStdIdIdx] === studentId) {
      var attempt = {};
      for (var j = 0; j < mcqHeaders.length; j++) {
        attempt[mcqHeaders[j]] = mcqData[i][j];
      }
      mcqAttempts.push(attempt);
    }
  }
  
  // SM history
  var smSheet = ss.getSheetByName("SM_Attempts");
  var smData = smSheet.getDataRange().getValues();
  var smHeaders = smData[0];
  var smAttempts = [];
  
  var sStdIdIdx = smHeaders.indexOf("student_id");
  for (var i = 1; i < smData.length; i++) {
    if (smData[i][sStdIdIdx] === studentId) {
      var attempt = {};
      for (var j = 0; j < smHeaders.length; j++) {
        attempt[smHeaders[j]] = smData[i][j];
      }
      smAttempts.push(attempt);
    }
  }
  
  // Compute some aggregate metrics
  var totalMcq = mcqAttempts.length;
  var totalSm = smAttempts.length;
  var streak = calculateStreak(mcqAttempts, smAttempts);
  
  // Identify weak chapters/topics based on wrong questions
  var weakestTopics = computeWeakestTopics(studentId, ss);
  
  return {
    status: "success",
    data: {
      mcq_attempts_count: totalMcq,
      sm_attempts_count: totalSm,
      streak: streak,
      mcq_attempts: mcqAttempts.slice(-10), // Return last 10 attempts
      sm_attempts: smAttempts.slice(-10),
      weakest_topics: weakestTopics
    }
  };
}

/**
 * Shared Helper Functions
 */

function getConfigValue(key) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Config");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      return data[i][1];
    }
  }
  return null;
}

function incrementStudentAttempt(studentId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Students");
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  var stdIdIdx = headers.indexOf("student_id");
  var attemptsIdx = headers.indexOf("total_attempts");
  var lastSeenIdx = headers.indexOf("last_seen");
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][stdIdIdx] === studentId) {
      var currentAttempts = Number(data[i][attemptsIdx]) || 0;
      sheet.getRange(i + 1, attemptsIdx + 1).setValue(currentAttempts + 1);
      sheet.getRange(i + 1, lastSeenIdx + 1).setValue(new Date());
      break;
    }
  }
}

function countWords(str) {
  if (!str) return 0;
  var cleanStr = str.trim().replace(/\s+/g, ' ');
  if (cleanStr === "") return 0;
  return cleanStr.split(' ').length;
}

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

function calculateStreak(mcq, sm) {
  var dates = [];
  mcq.forEach(function(a) { dates.push(new Date(a.submitted_at).toDateString()); });
  sm.forEach(function(a) { dates.push(new Date(a.submitted_at).toDateString()); });
  
  // Unique sorted dates
  var uniqueDates = dates.filter(function(value, index, self) {
    return self.indexOf(value) === index;
  }).map(function(d) { return new Date(d); })
    .sort(function(a, b) { return b - a; }); // Newest first
    
  if (uniqueDates.length === 0) return 0;
  
  var streak = 0;
  var today = new Date();
  var yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  
  var checkDate = new Date(uniqueDates[0].toDateString());
  var todayStr = today.toDateString();
  var yesterdayStr = yesterday.toDateString();
  
  // If the last activity was not today or yesterday, streak is broken
  if (checkDate.toDateString() !== todayStr && checkDate.toDateString() !== yesterdayStr) {
    return 0;
  }
  
  streak = 1;
  for (var i = 0; i < uniqueDates.length - 1; i++) {
    var diffTime = Math.abs(uniqueDates[i] - uniqueDates[i+1]);
    var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      streak++;
    } else if (diffDays > 1) {
      break; // Streak broken
    }
  }
  return streak;
}

function getWeakAreaQuestions(questions, studentId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var respSheet = ss.getSheetByName("MCQ_Responses");
  var rData = respSheet.getDataRange().getValues();
  var headers = rData[0];
  var attemptIdIdx = headers.indexOf("attempt_id");
  var qIdIdx = headers.indexOf("q_id");
  var isCorrectIdx = headers.indexOf("is_correct");
  
  // Get all MCQ attempts by this student to fetch matching attempt IDs
  var mcqAttemptsSheet = ss.getSheetByName("MCQ_Attempts");
  var attData = mcqAttemptsSheet.getDataRange().getValues();
  var studentIdIdx = attData[0].indexOf("student_id");
  
  var studentAttempts = {};
  for (var i = 1; i < attData.length; i++) {
    if (attData[i][studentIdIdx] === studentId) {
      studentAttempts[attData[i][0]] = true; // attempt_id mapping
    }
  }
  
  // Aggregate wrong attempts by q_id
  var wrongCount = {};
  for (var j = 1; j < rData.length; j++) {
    var attId = rData[j][attemptIdIdx];
    if (studentAttempts[attId]) {
      var qId = rData[j][qIdIdx];
      var isCorrect = rData[j][isCorrectIdx].toString().toLowerCase() === "true";
      
      if (!isCorrect) {
        wrongCount[qId] = (wrongCount[qId] || 0) + 1;
      }
    }
  }
  
  // Sort questions based on wrongCount desc
  questions.sort(function(a, b) {
    var countA = wrongCount[a.q_id] || 0;
    var countB = wrongCount[b.q_id] || 0;
    return countB - countA;
  });
  
  return questions.slice(0, 20);
}

function getRetryWrongQuestions(questions, studentId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var respSheet = ss.getSheetByName("MCQ_Responses");
  var rData = respSheet.getDataRange().getValues();
  var headers = rData[0];
  var attemptIdIdx = headers.indexOf("attempt_id");
  var qIdIdx = headers.indexOf("q_id");
  var isCorrectIdx = headers.indexOf("is_correct");
  
  // Fetch attempt dates and IDs
  var mcqAttemptsSheet = ss.getSheetByName("MCQ_Attempts");
  var attData = mcqAttemptsSheet.getDataRange().getValues();
  var studentIdIdx = attData[0].indexOf("student_id");
  var submittedAtIdx = attData[0].indexOf("submitted_at");
  
  var studentAttempts = {};
  for (var i = 1; i < attData.length; i++) {
    if (attData[i][studentIdIdx] === studentId) {
      studentAttempts[attData[i][0]] = new Date(attData[i][submittedAtIdx]);
    }
  }
  
  // Get wrong questions that occurred at least 3 days ago
  var wrongQuestionsMap = {};
  var threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  for (var j = 1; j < rData.length; j++) {
    var attId = rData[j][attemptIdIdx];
    var submitDate = studentAttempts[attId];
    if (submitDate && submitDate <= threeDaysAgo) {
      var qId = rData[j][qIdIdx];
      var isCorrect = rData[j][isCorrectIdx].toString().toLowerCase() === "true";
      if (!isCorrect) {
        wrongQuestionsMap[qId] = true;
      }
    }
  }
  
  // Filter questions
  var filtered = questions.filter(function(q) {
    return wrongQuestionsMap[q.q_id] === true;
  });
  
  shuffleArray(filtered);
  return filtered;
}

function computeWeakestTopics(studentId, ss) {
  // Simple extraction of student's weakest 5 topics
  var respSheet = ss.getSheetByName("MCQ_Responses");
  var rData = respSheet.getDataRange().getValues();
  var rHeaders = rData[0];
  
  // Get all MCQ attempts by this student to fetch matching attempt IDs
  var mcqAttemptsSheet = ss.getSheetByName("MCQ_Attempts");
  var attData = mcqAttemptsSheet.getDataRange().getValues();
  var studentIdIdx = attData[0].indexOf("student_id");
  
  var studentAttempts = {};
  for (var i = 1; i < attData.length; i++) {
    if (attData[i][studentIdIdx] === studentId) {
      studentAttempts[attData[i][0]] = true; // attempt_id mapping
    }
  }
  
  // Get questions map to check topics
  var mcqQSheet = ss.getSheetByName("MCQ_Questions");
  var qData = mcqQSheet.getDataRange().getValues();
  var qMap = {};
  for (var k = 1; k < qData.length; k++) {
    qMap[qData[k][0]] = qData[k][1]; // map q_id -> topic_id
  }
  
  var topicStats = {};
  for (var j = 1; j < rData.length; j++) {
    var attId = rData[j][0];
    if (studentAttempts[attId]) {
      var qId = rData[j][1];
      var topicId = qMap[qId];
      if (!topicId) continue;
      
      var isCorrect = rData[j][4].toString().toLowerCase() === "true";
      if (!topicStats[topicId]) {
        topicStats[topicId] = { correct: 0, total: 0 };
      }
      topicStats[topicId].total++;
      if (isCorrect) topicStats[topicId].correct++;
    }
  }
  
  var list = [];
  for (var tId in topicStats) {
    var acc = topicStats[tId].correct / topicStats[tId].total;
    list.push({ topic_id: tId, accuracy: acc, total: topicStats[tId].total });
  }
  
  // Sort by accuracy asc, return worst 5
  list.sort(function(a, b) { return a.accuracy - b.accuracy; });
  return list.slice(0, 5);
}

/**
 * Placeholder Administration Functions for the Menu
 */

function menuRefreshDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  setupDashboardSheet(ss);
  
  // Auto-resize Dashboard columns specifically
  var sheet = ss.getSheetByName("Dashboard");
  sheet.autoResizeColumns(1, 10);
  
  SpreadsheetApp.getUi().alert("Success", "Dashboard metrics and charts refreshed!", SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuExportCsv() {
  try {
    var folderName = "VC_Gurukul_Backups";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder;
    
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ["Students", "MCQ_Attempts", "SM_Attempts"];
    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
    
    sheets.forEach(function(sName) {
      var sheet = ss.getSheetByName(sName);
      if (!sheet) return;
      
      var data = sheet.getDataRange().getValues();
      var csvContent = "";
      
      for (var i = 0; i < data.length; i++) {
        var row = data[i].map(function(cell) {
          var str = cell.toString().replace(/"/g, '""');
          if (str.search(/("|,|\n)/g) >= 0) {
            str = '"' + str + '"';
          }
          return str;
        });
        csvContent += row.join(",") + "\n";
      }
      
      var filename = sName + "_" + timestamp + ".csv";
      folder.createFile(filename, csvContent, MimeType.CSV);
    });
    
    SpreadsheetApp.getUi().alert("Backup Complete", "CSV backups exported to Google Drive folder: '" + folderName + "'", SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) {
    SpreadsheetApp.getUi().alert("Backup Error", err.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function menuDeployCheck() {
  var appToken = PropertiesService.getScriptProperties().getProperty("app_token");
  var message = "DEPLOYMENT CHECK:\n\n";
  message += "1. Executing Web App URL: Verify you deployed as 'Execute as: Me' and 'Who has access: Anyone'.\n";
  message += "2. Script Properties Security: \n";
  
  if (appToken) {
    message += "   - app_token is ACTIVE.\n";
  } else {
    message += "   - app_token is MISSING! Make sure to run setup or write a token.\n";
  }
  
  message += "\nEnsure you use the exact token matching 'app_token' in your frontend environment variables to connect successfully.";
  SpreadsheetApp.getUi().alert("Deploy Diagnostic", message, SpreadsheetApp.getUi().ButtonSet.OK);
}
