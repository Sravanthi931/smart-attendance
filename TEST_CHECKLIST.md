# ✅ Quick Test Checklist

Use this checklist to verify the enrollment and attendance system works end-to-end.

---

## 🧪 Test Case 1: Student Enrollment

**Setup:** Have 2 browser windows open, or 2 different browsers

**Steps:**
- [ ] Window 1: Login as STUDENT
- [ ] Window 2: Login as FACULTY
- [ ] Student window: Go to `/enroll-subjects`
- [ ] See available subjects listed
- [ ] Click "Enroll" on any subject
- [ ] Verify enrollment count increases
- [ ] Faculty window: Refresh `/mark-attendance`
- [ ] Select the subject student enrolled in
- [ ] ✅ **VERIFY:** Student name appears in "Enrolled Students" list

**Expected Result:** Faculty sees student name immediately (or within seconds)

---

## 🧪 Test Case 2: Mark Attendance Without Refresh

**Prerequisites:** Student is enrolled in subject (Test Case 1)

**Setup:** Keep both windows open

**Steps:**
- [ ] Faculty window: On `/mark-attendance`, student visible
- [ ] Student window: Enroll in ANOTHER subject
- [ ] Faculty window: **DO NOT REFRESH**
- [ ] Faculty selects the NEW subject (without page refresh)
- [ ] ✅ **VERIFY:** New student appears in the list

**Expected Result:** Real-time update without page refresh

---

## 🧪 Test Case 3: Mark Attendance

**Prerequisites:** Student enrolled in subject

**Steps:**
- [ ] Faculty: Go to `/mark-attendance`
- [ ] Select a subject with students
- [ ] See student name(s) displayed
- [ ] Click checkbox for a student
- [ ] ✅ **VERIFY:** Student row shows "✓ Present" indicator
- [ ] Click again to uncheck
- [ ] ✅ **VERIFY:** Student row shows "✗ Absent" indicator
- [ ] Click "Mark All"
- [ ] ✅ **VERIFY:** Present count shows all students
- [ ] Click "Submit Attendance"
- [ ] ✅ **VERIFY:** Alert shows "Attendance marked successfully!"

**Expected Result:** Attendance saved to database

---

## 🧪 Test Case 4: View Attendance (Student)

**Prerequisites:** Faculty marked attendance for student (Test Case 3)

**Steps:**
- [ ] Student: Navigate to `/attendance`
- [ ] See "Your Attendance" page
- [ ] ✅ **VERIFY:** Subject appears in the list
- [ ] ✅ **VERIFY:** Subject shows:
  - [ ] Subject name and code
  - [ ] Total classes (should match marked attendance)
  - [ ] Classes attended (with ✓ icon)
  - [ ] Classes missed (with ✗ icon)
  - [ ] Attendance percentage
- [ ] Check overall attendance percentage pie chart
- [ ] Check summary stats box

**Expected Result:** All attendance data visible and calculated correctly

---

## 🧪 Test Case 5: Multiple Subjects

**Setup:** Test with 3 different subjects

**Steps:**
- [ ] Student: Enroll in Subject A, B, C
- [ ] Faculty A: Mark attendance for Subject A (e.g., mark 3 classes)
- [ ] Faculty B: Mark attendance for Subject B (e.g., mark 2 classes)
- [ ] Faculty A: Mark attendance again for Subject A (e.g., mark 1 class absent)
- [ ] Student: View `/attendance`
- [ ] ✅ **VERIFY:** All 3 subjects show in table
- [ ] ✅ **VERIFY:** Each subject shows correct class counts:
  - [ ] Subject A: 4 total, 3 attended
  - [ ] Subject B: 2 total, 2 attended
  - [ ] Subject C: 0 (no attendance marked yet)
- [ ] ✅ **VERIFY:** Overall % calculated correctly

**Expected Result:** Independent tracking per subject

---

## 🧪 Test Case 6: Enrollment Numbers Display

**Prerequisites:** Student enrolled in subject

**Steps:**
- [ ] Faculty: Go to `/mark-attendance`
- [ ] Select subject with students
- [ ] Look at student names
- [ ] ✅ **VERIFY:** Each student shows:
  - [ ] Name (bold)
  - [ ] Enrollment ID (gray text, prefixed with "ID:")
  - [ ] Attendance status (✓ or ✗)

**Expected Result:** Complete student information visible

---

## 🧪 Test Case 7: No Students Enrolled

**Setup:** Subject with no enrolled students

**Steps:**
- [ ] Faculty: Go to `/mark-attendance`
- [ ] Select a subject with NO students
- [ ] ✅ **VERIFY:** Instead of student list, see message:
  ```
  No students enrolled yet
  Students will appear here once they enroll in this subject
  ```
- [ ] ✅ **VERIFY:** "Mark All", "Clear All", and "Submit" buttons are disabled

**Expected Result:** Graceful empty state handling

---

## 🧪 Test Case 8: Filter & Sort

**Prerequisites:** Student enrolled in multiple subjects

**Steps:**
- [ ] Student: Go to `/enroll-subjects`
- [ ] Use department filter
- [ ] ✅ **VERIFY:** Only subjects from selected department show
- [ ] Use semester filter
- [ ] ✅ **VERIFY:** Only subjects from selected semester show
- [ ] Clear filters
- [ ] ✅ **VERIFY:** All subjects reappear

**Expected Result:** Filters work correctly

---

## 🧪 Test Case 9: UI Responsiveness

**Steps:**
- [ ] Open `/mark-attendance` on mobile device or zoom browser to 50%
- [ ] ✅ **VERIFY:** Layout adapts properly
- [ ] ✅ **VERIFY:** All text readable
- [ ] ✅ **VERIFY:** Buttons clickable
- [ ] ✅ **VERIFY:** Student list scrollable if many students

**Expected Result:** Mobile-friendly interface

---

## 🧪 Test Case 10: Data Persistence

**Prerequisites:** Previous tests completed with data

**Steps:**
- [ ] Student: View `/attendance` page
- [ ] Note the attendance percentages
- [ ] Close browser completely
- [ ] Reopen and log in again
- [ ] Go to `/attendance`
- [ ] ✅ **VERIFY:** Same attendance data persists

**Expected Result:** Data saved in Firestore

---

## 📋 Admin Verification Tests

### Test: Manage Subjects
- [ ] Admin: Go to `/manage-subjects`
- [ ] Create new subject
- [ ] Assign faculty
- [ ] ✅ **VERIFY:** Appears in faculty's mark attendance list

### Test: Manage Users
- [ ] Admin: Go to `/manage-users`
- [ ] Create student and faculty users
- [ ] Verify roles assigned correctly
- [ ] ✅ **VERIFY:** Users can access role-specific pages

### Test: System Reports
- [ ] Admin: Go to `/system-reports`
- [ ] ✅ **VERIFY:** Total users, students, faculty counts
- [ ] ✅ **VERIFY:** Attendance statistics shown

---

## 🎯 Scoring

- **All tests pass:** ✅ System is fully functional
- **8+ tests pass:** ✅ Core functionality working
- **5-7 tests pass:** ⚠️ Some features working, debug others
- **<5 tests pass:** ❌ Check browser console for errors

---

## 🐛 Troubleshooting

### Issue: Student list not showing on faculty page
**Fix:** 
1. Check that student is actually enrolled (check ManageSubjects)
2. Faculty should select the subject (may auto-select first one)
3. Reload the page

### Issue: Attendance not saving
**Fix:**
1. Check browser console (F12) for errors
2. Ensure "Submit Attendance" button was clicked
3. Check Firestore rules allow 'attendance' collection writes

### Issue: Student enrolled but can't see in faculty list
**Fix:**
1. Hard refresh (Ctrl+Shift+R) faculty's browser
2. Log out and log back in as faculty
3. Check that both users are in same subject

---

## ✅ Final Sign-Off

Once all tests pass, system is ready for:
- [ ] Production deployment
- [ ] User training
- [ ] Live usage

**Deployment Command:**
```bash
npm run build
firebase deploy
```

Live URL: https://smart-attendance-b57d5.web.app

---

**Test Date:** _______________  
**Tester Name:** _______________  
**Result:** ✅ PASS / ❌ FAIL
