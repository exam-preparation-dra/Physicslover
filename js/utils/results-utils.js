/* =========================================================
   RESULTS & EXAM READ UTILITIES (student-facing)
   ========================================================= */
import { db } from "../firebase/firebase-config.js";
import { collection, doc, getDoc, getDocs, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export async function getStudentResultStatusMap(studentId) {
  const q = query(collection(db, "results"), where("studentId", "==", studentId));
  const snap = await getDocs(q);
  const map = {};
  snap.docs.forEach(d => { const data = d.data(); map[data.examId] = { status: data.status, resultId: d.id }; });
  return map;
}

export async function getUpcomingExams() {
  const q = query(collection(db, "exams"), where("status", "in", ["upcoming", "published"]));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.examDate?.toMillis?.() ?? 0) - (b.examDate?.toMillis?.() ?? 0));
}

export function subscribeToUpcomingExams(onChange, onError) {
  const q = query(collection(db, "exams"), where("status", "in", ["upcoming", "published"]));
  return onSnapshot(q, (snap) => {
      const exams = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.examDate?.toMillis?.() ?? 0) - (b.examDate?.toMillis?.() ?? 0));
      onChange(exams);
    }, (err) => { if (onError) onError(err); }
  );
}

export async function getAllApprovedResults() {
  const q = query(collection(db, "results"), where("status", "==", "approved"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.submittedAt?.toMillis?.() ?? 0) - (a.submittedAt?.toMillis?.() ?? 0));
}

export async function getApprovedResults(studentId) {
  const q = query(collection(db, "results"), where("studentId", "==", studentId), where("status", "==", "approved"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.submittedAt?.toMillis?.() ?? 0) - (a.submittedAt?.toMillis?.() ?? 0));
}

export async function getResultById(resultId) {
  const snap = await getDoc(doc(db, "results", resultId)); return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ---------- FLAWLESS GAMING XP LOGIC ----------
function calculateGamingStats(data) {
  const sumPct = data.pcts.reduce((a, b) => a + b, 0);
  const avgPercentage = data.pcts.length ? Math.round((sumPct / data.pcts.length) * 10) / 10 : 0;
  
  // 1. Calculate strictly performance-based Base XP (No loops possible)
  const baseXP = Math.round((data.obtainedMarks * 10) + (data.pcts.length * 50) + (data.correctCount * 5) + (data.perfectExams * 100));
  
  // 2. Determine Level based ONLY on Base XP
  const levels = [0, 1000, 3000, 6000, 10000, 15000, 25000, 40000, 60000];
  let currentLevel = 1;
  for(let i=0; i<levels.length; i++) { if(baseXP >= levels[i]) currentLevel = i + 1; }
  
  // 3. Calculate Bonus XP strictly derived from Level
  const levelBonusXP = (currentLevel > 1) ? ((currentLevel - 1) * 500) : 0;
  
  // 4. Final Total XP for Leaderboard
  const totalPoints = baseXP + levelBonusXP;
  
  return { avgPercentage, baseXP, level: currentLevel, totalPoints, examsTaken: data.pcts.length };
}

export async function getLeaderboardData(studentsList) {
  const results = await getAllApprovedResults();
  const byStudent = {};
  for (const r of results) {
    if (!byStudent[r.studentId]) { byStudent[r.studentId] = { pcts: [], correctCount: 0, obtainedMarks: 0, perfectExams: 0 }; }
    const percentage = Number(r.percentage) || 0;
    byStudent[r.studentId].pcts.push(percentage);
    byStudent[r.studentId].correctCount += (Number(r.correctCount) || 0);
    byStudent[r.studentId].obtainedMarks += (Number(r.obtainedMarks) || 0);
    if (percentage === 100) { byStudent[r.studentId].perfectExams += 1; }
  }
  
  const infoOf = {};
  studentsList.forEach(s => { infoOf[s.studentId] = s; });

  const rows = Object.entries(byStudent).map(([studentId, data]) => {
    const stats = calculateGamingStats(data);
    return {
      studentId, name: infoOf[studentId]?.name || studentId, photoURL: infoOf[studentId]?.photoURL || null, className: infoOf[studentId]?.className || null,
      avgPercentage: stats.avgPercentage, examsTaken: stats.examsTaken, totalPoints: stats.totalPoints, level: stats.level
    };
  });
  
  rows.sort((a, b) => b.totalPoints - a.totalPoints);
  return rows;
}

export async function getStudentRank(studentId, classOf = null) {
  const all = await getAllApprovedResults();
  if (all.length === 0) return null;

  const byStudent = {};
  for (const r of all) {
    if (!byStudent[r.studentId]) { byStudent[r.studentId] = { pcts: [], correctCount: 0, obtainedMarks: 0, perfectExams: 0 }; }
    const percentage = Number(r.percentage) || 0;
    byStudent[r.studentId].pcts.push(percentage);
    byStudent[r.studentId].correctCount += (Number(r.correctCount) || 0);
    byStudent[r.studentId].obtainedMarks += (Number(r.obtainedMarks) || 0);
    if (percentage === 100) byStudent[r.studentId].perfectExams += 1;
  }

  const stats = Object.entries(byStudent).map(([sid, data]) => {
    const s = calculateGamingStats(data);
    return { studentId: sid, average: s.avgPercentage, totalPoints: s.totalPoints, level: s.level };
  });

  if (!stats.some(a => a.studentId === studentId)) return null;

  stats.sort((a, b) => b.totalPoints - a.totalPoints);
  const rank = stats.findIndex(a => a.studentId === studentId) + 1;
  const mine = stats.find(a => a.studentId === studentId);
  const result = { rank, totalStudents: stats.length, averagePercentage: mine.average, totalPoints: mine.totalPoints, level: mine.level };

  if (classOf) {
    const myClass = classOf[studentId];
    if (myClass) {
      const classStats = stats.filter(a => classOf[a.studentId] === myClass);
      const classRank = classStats.findIndex(a => a.studentId === studentId) + 1;
      if (classRank > 0) { result.classRank = classRank; result.classTotalStudents = classStats.length; result.className = myClass; }
    }
  }
  return result;
}

export async function getExamById(examId) { const snap = await getDoc(doc(db, "exams", examId)); return snap.exists() ? { id: snap.id, ...snap.data() } : null; }
export async function getExamSnapshot(examId) { const snap = await getDoc(doc(db, "examSnapshots", examId)); return snap.exists() ? snap.data() : null; }
export async function getExamSnapshotsMap(examIds) { const uniqueIds = [...new Set(examIds)]; const snaps = await Promise.all(uniqueIds.map(id => getExamSnapshot(id))); const map = {}; uniqueIds.forEach((id, i) => { if (snaps[i]) map[id] = snaps[i]; }); return map; }
export async function getChapterExamFrequencyMap(chapterIds) {
  const freq = {}; chapterIds.forEach(id => { freq[id] = 0; }); if (chapterIds.length === 0) return freq;
  const chunks = []; for (let i = 0; i < chapterIds.length; i += 10) chunks.push(chapterIds.slice(i, i + 10));
  for (const chunk of chunks) {
    const q = query(collection(db, "exams"), where("chapterIds", "array-contains-any", chunk));
    const snap = await getDocs(q);
    snap.docs.forEach(d => { const data = d.data(); if (data.status === "draft") return; (data.chapterIds || []).forEach(cid => { if (chunk.includes(cid)) freq[cid] = (freq[cid] || 0) + 1; }); });
  }
  return freq;
}