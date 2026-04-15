export const i18nDict = {
  'zh-CN': {
    learningCenter: '智能学习中心',
    teacherDashboard: '教师后台',
    masteryRate: '知识点掌握率',
    startLearning: '开始学习',
    submitAnswer: '提交答案',
    correct: '回答正确！',
    incorrect: '回答错误，请结合左侧实验再试一次。',
    explanation: '知识点讲解',
    practice: '随堂练习',
    generateReport: '导出学习报告 (PDF)',
    difficultyLevel: '当前难度',
    cloudSync: '同步到云端',
    classManage: '班级学情概览'
  },
  'en-US': {
    learningCenter: 'Adaptive Learning Center',
    teacherDashboard: 'Teacher Dashboard',
    masteryRate: 'Mastery Rate',
    startLearning: 'Start Learning',
    submitAnswer: 'Submit Answer',
    correct: 'Correct!',
    incorrect: 'Incorrect. Try adjusting the 3D experiment.',
    explanation: 'Concept Explanation',
    practice: 'Practice',
    generateReport: 'Export Report (PDF)',
    difficultyLevel: 'Difficulty Level',
    cloudSync: 'Sync to Cloud',
    classManage: 'Class Overview'
  }
};

export class I18nManager {
  private currentLang: 'zh-CN' | 'en-US' = 'zh-CN';

  public setLang(lang: 'zh-CN' | 'en-US') {
    this.currentLang = lang;
  }

  public getLang() {
    return this.currentLang;
  }

  public t(key: keyof typeof i18nDict['zh-CN']): string {
    return i18nDict[this.currentLang][key];
  }
}
