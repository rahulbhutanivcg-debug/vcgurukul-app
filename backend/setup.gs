/**
 * VC Gurukul Practice App - Database Setup Script
 * Deployed under Phase 1.
 * 
 * Paste this script into your Google Sheet's Apps Script editor (Extensions -> Apps Script).
 * Run the setupDatabase() function to create all required sheets with headers, settings, and sample data.
 */

function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Define sheets and their headers
  var schema = {
    "Config": [
      "key", "value", "description"
    ],
    "Chapters": [
      "chapter_id", "subject", "chapter_no", "chapter_name", "icai_weightage", "is_active"
    ],
    "Topics": [
      "topic_id", "chapter_id", "topic_name", "sequence", "is_active"
    ],
    "MCQ_Questions": [
      "q_id", "topic_id", "chapter_id", "section", "question_text", 
      "option_a", "option_b", "option_c", "option_d", "correct_option", 
      "difficulty", "expected_time_sec", "source_tag", "solution_steps", 
      "distractor_a_note", "distractor_b_note", "distractor_c_note", "distractor_d_note", "is_active"
    ],
    "SM_Questions": [
      "q_id", "topic_id", "chapter_id", "question_text", "marks", "word_min", "word_max", "source_tag", "difficulty", "is_active"
    ],
    "SM_Rubric_Points": [
      "point_id", "q_id", "point_no", "marks", "point_summary", "keywords", "source_ref"
    ],
    "SM_Model_Answers": [
      "q_id", "model_answer_text", "source_ref"
    ],
    "Students": [
      "student_id", "name", "phone", "email", "city", "level", "batch_code", "first_seen", "last_seen", "total_attempts"
    ],
    "MCQ_Attempts": [
      "attempt_id", "student_id", "name", "mode", "chapter_id", "started_at", "submitted_at", 
      "total_q", "attempted", "correct", "wrong", "skipped", "score", "max_score", "accuracy_pct", "time_taken_sec", "error_tag_summary"
    ],
    "MCQ_Responses": [
      "attempt_id", "q_id", "selected_option", "correct_option", "is_correct", "time_taken_sec"
    ],
    "SM_Attempts": [
      "attempt_id", "student_id", "name", "q_id", "chapter_id", "marks_possible", "self_score", 
      "word_count", "points_covered", "points_missed", "keywords_missed", "time_taken_sec", "answer_text", "submitted_at", "inflation_flag_count"
    ],
    "Import_Paste": [
      "raw_data"
    ],
    "Import_Errors": [
      "timestamp", "row_index", "error_message"
    ]
  };

  // Create or clean sheets
  for (var sheetName in schema) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    } else {
      // Clear all content & formats to avoid dirty schema states
      sheet.clear();
      sheet.getDataRange().clearFormat();
    }
    
    // Set headers
    var headers = schema[sheetName];
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    
    // Style headers (Indigo blue theme: #4F46E5)
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#4F46E5");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setHorizontalAlignment("center");
    
    // Freeze first row
    sheet.setFrozenRows(1);
  }

  // Populate Default Configurations
  var configSheet = ss.getSheetByName("Config");
  var defaultConfig = [
    ["app_name", "VC Gurukul Practice App", "The visible name of the student application"],
    ["marks_per_correct", "1", "Marks awarded for each correct MCQ option"],
    ["negative_marks_per_wrong", "0.25", "Marks subtracted for each wrong MCQ option"],
    ["options_per_question", "4", "Number of choices per MCQ (usually 4: A, B, C, D)"],
    ["mock_duration_min", "120", "Duration for a full length mock test in minutes"],
    ["mock_question_count", "100", "Total number of questions in a full mock exam"],
    ["daily_limit", "5", "Maximum daily practice attempts permitted per student"],
    ["announcement_text", "Welcome to VC Gurukul! Daily practice strengthens concept clarity.", "Banner message shown at top of the app"],
    ["is_app_live", "true", "Global toggle to enable/disable student access (true/false)"]
  ];
  configSheet.getRange(2, 1, defaultConfig.length, 3).setValues(defaultConfig);

  // Populate Sample Data for Testing
  populateSampleData(ss);

  // Format Dashboard sheet specifically
  setupDashboardSheet(ss);

  // Auto-resize columns for all sheets for readablity
  for (var sheetName in schema) {
    var sheet = ss.getSheetByName(sheetName);
    if (sheet.getLastColumn() > 0) {
      sheet.autoResizeColumns(1, sheet.getLastColumn());
    }
  }

  SpreadsheetApp.getUi().alert("Success", "VC Gurukul database tabs and sample content initialized successfully!", SpreadsheetApp.getUi().ButtonSet.OK);
}

function populateSampleData(ss) {
  // 1. Chapters Sample Data
  var chaptersSheet = ss.getSheetByName("Chapters");
  var sampleChapters = [
    ["ch_q_01", "QUANT", "1", "Ratio and Proportion, Indices, Logarithms", "10%", "true"],
    ["ch_sm_01", "SM", "1", "Introduction to Strategic Management", "15%", "true"]
  ];
  chaptersSheet.getRange(2, 1, sampleChapters.length, 6).setValues(sampleChapters);

  // 2. Topics Sample Data
  var topicsSheet = ss.getSheetByName("Topics");
  var sampleTopics = [
    ["tp_q_01_01", "ch_q_01", "Ratios & Proportions Basic Concepts", "1", "true"],
    ["tp_sm_01_01", "ch_sm_01", "Business Policy & Strategy Essentials", "1", "true"]
  ];
  topicsSheet.getRange(2, 1, sampleTopics.length, 5).setValues(sampleTopics);

  // 3. MCQ Questions Sample Data
  var mcqSheet = ss.getSheetByName("MCQ_Questions");
  var sampleMCQs = [
    [
      "mcq_001", "tp_q_01_01", "ch_q_01", "Section A", 
      "If A:B = 2:3 and B:C = 4:5, then A:B:C is:", 
      "8:12:15", "2:3:5", "4:6:15", "8:6:10", "A", 
      "Easy", "45", "ICAI Module", "Multiply B parts to align them. A:B = 8:12, B:C = 12:15. Hence, A:B:C = 8:12:15.", 
      "Correct option identified by equalizing the ratio of B.", 
      "Incorrect. Ensure B is equalized correctly in both ratios.", 
      "Incorrect. Common mistake of cross multiplying without alignment.", 
      "Incorrect. Checked direct ratio values without normalization.", 
      "true"
    ],
    [
      "mcq_002", "tp_q_01_01", "ch_q_01", "Section A", 
      "What is the duplicate ratio of 3:4?", 
      "9:16", "6:8", "square_root(3):2", "27:64", "A", 
      "Easy", "30", "ICAI Module", "Duplicate ratio of a:b is a^2 : b^2. So 3^2 : 4^2 = 9:16.", 
      "Correct option. Simply square the terms.", 
      "Incorrect. This is double ratio (multiplied by 2), not duplicate ratio.", 
      "Incorrect. This is sub-duplicate ratio (square roots).", 
      "Incorrect. This is triplicate ratio (cubed values).", 
      "true"
    ]
  ];
  mcqSheet.getRange(2, 1, sampleMCQs.length, 19).setValues(sampleMCQs);

  // 4. SM Questions Sample Data
  var smSheet = ss.getSheetByName("SM_Questions");
  var sampleSMs = [
    [
      "sm_001", "tp_sm_01_01", "ch_sm_01", 
      "Define Strategic Management and briefly explain its key objectives.", 
      "5", "100", "250", "Study Material", "Medium", "true"
    ]
  ];
  smSheet.getRange(2, 1, sampleSMs.length, 10).setValues(sampleSMs);

  // 5. SM Rubric Points
  var rubricSheet = ss.getSheetByName("SM_Rubric_Points");
  var sampleRubrics = [
    ["rub_001_1", "sm_001", 1, 1.0, "Definition of Strategic Management (Systematic alignment of resources/capabilities with environment)", "strategic management, systemic, resources, capabilities, environment", "Notes Page 12"],
    ["rub_001_2", "sm_001", 2, 1.0, "Objective 1: To guide the company through changes (dynamic alignment)", "guide, change, dynamic alignment, adapt", "Notes Page 13"],
    ["rub_001_3", "sm_001", 3, 1.0, "Objective 2: To create competitive advantage (superior performance)", "competitive advantage, superior performance, edge", "Notes Page 13"],
    ["rub_001_4", "sm_001", 4, 1.0, "Objective 3: To provide directions for organizational growth", "direction, growth, roadmap", "Notes Page 14"],
    ["rub_001_5", "sm_001", 5, 1.0, "Objective 4: To integrate various functional areas cohesively", "integrate, functional areas, cohesion, synergy", "Notes Page 14"]
  ];
  rubricSheet.getRange(2, 1, sampleRubrics.length, 7).setValues(sampleRubrics);

  // 6. SM Model Answers
  var modelAnsSheet = ss.getSheetByName("SM_Model_Answers");
  var sampleModelAns = [
    [
      "sm_001", 
      "Strategic Management is defined as the process of formulating, implementing, and evaluating cross-functional decisions that enable an organization to achieve its objectives. It integrates management, marketing, finance, production, and R&D. \n\nKey Objectives:\n1. Guide the company through environmental changes: Maintain dynamic alignment with external threats and opportunities.\n2. Create Competitive Advantage: Enable the organization to outperform rivals consistently.\n3. Direction for Growth: Establishes a long-term roadmap and cohesive vision.\n4. Integrate functional areas: Align finance, HR, marketing, and operations to build synergies.", 
      "ICAI Chapter 1 Summary"
    ]
  ];
  modelAnsSheet.getRange(2, 1, sampleModelAns.length, 3).setValues(sampleModelAns);

  // 7. Student Sample
  var studentSheet = ss.getSheetByName("Students");
  var sampleStudent = [
    ["std_test_001", "Demo Student", "9999999999", "demo@vcgurukul.com", "Mumbai", "Intermediate", "BATCH2026", new Date(), new Date(), 0]
  ];
  studentSheet.getRange(2, 1, sampleStudent.length, 10).setValues(sampleStudent);
}

function setupDashboardSheet(ss) {
  var sheet = ss.getSheetByName("Dashboard");
  if (!sheet) {
    sheet = ss.insertSheet("Dashboard");
  }
  sheet.clear();
  sheet.getDataRange().clearFormat();
  sheet.setFrozenRows(0);
  
  // Style and setup simple Admin KPIs using native sheet formulas
  sheet.getRange("A1").setValue("VC GURUKUL - CORE ADMIN DASHBOARD").setFontSize(16).setFontWeight("bold").setFontColor("#1E3A8A");
  
  sheet.getRange("A3").setValue("Overview Metrics").setFontSize(12).setFontWeight("bold").setFontColor("#4F46E5");
  sheet.getRange("A4").setValue("Total Registered Students:");
  sheet.getRange("B4").setValue("=COUNTA(Students!A:A)-1");
  sheet.getRange("A5").setValue("Total MCQ Test Attempts:");
  sheet.getRange("B5").setValue("=COUNTA(MCQ_Attempts!A:A)-1");
  sheet.getRange("A6").setValue("Total SM Test Attempts:");
  sheet.getRange("B6").setValue("=COUNTA(SM_Attempts!A:A)-1");

  sheet.getRange("A8").setValue("Batch Performance Leaderboard (Top 20)").setFontSize(12).setFontWeight("bold").setFontColor("#4F46E5");
  
  var leaderboardHeaders = ["Rank", "Student ID", "Name", "Avg MCQ Score", "Total MCQ Attempts"];
  sheet.getRange(9, 1, 1, 5).setValues([leaderboardHeaders]).setFontWeight("bold").setBackground("#E0E7FF").setHorizontalAlignment("center");
  
  for (var r = 1; r <= 20; r++) {
    sheet.getRange(9 + r, 1).setValue(r);
  }
  
  sheet.getRange("B10").setValue('=IFERROR(QUERY(MCQ_Attempts!B:M, "select B, C, avg(L), count(A) where B is not null group by B, C order by avg(L) desc limit 20 label avg(L) \'\', count(A) \'\'", 0), "No attempts yet")');

  sheet.getRange("G3").setValue("Most Missed Rubric Keywords").setFontSize(12).setFontWeight("bold").setFontColor("#B91C1C");
  sheet.getRange("G4").setValue("=IFERROR(QUERY(SM_Attempts!I:K, \"select K, count(A) where K is not null and K <> '' group by K order by count(A) desc limit 10 label count(A) 'Times Missed'\", 1), \"No SM attempts yet\")");

  sheet.getRange("A32").setValue("Notice: Press the custom menu 'VC Gurukul -> Refresh Dashboard' to trigger automated summary compilation if calculations fall behind.").setFontStyle("italic").setFontColor("#6B7280");
}
