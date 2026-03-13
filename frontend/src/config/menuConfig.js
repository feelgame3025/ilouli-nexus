/**
 * Centralized menu configuration
 * Single source of truth for NavigationBar and SubMenu components
 */

import { getHostUrl, HOSTS } from '../utils/hostConfig';

/**
 * AI Features menu items
 */
export const AI_MENU_ITEMS = [
  {
    path: '/',
    label: 'AI 홈',
    labelKey: 'nav.aiHome',
    icon: 'home',
    description: '모든 AI 도구 보기',
    descKey: 'nav.aiHomeDesc'
  },
  {
    path: '/audio-analysis',
    label: '음성 분석',
    labelKey: 'nav.audioAnalysis',
    icon: 'audioWave',
    description: '음성→텍스트 변환 및 요약',
    descKey: 'nav.audioAnalysisDesc'
  },
  {
    path: '/content-summarize',
    label: '콘텐츠 요약',
    labelKey: 'nav.contentSummarize',
    icon: 'document',
    description: '텍스트/문서 요약',
    descKey: 'nav.contentSummarizeDesc'
  },
  {
    path: '/video-creator',
    label: '영상 제작',
    labelKey: 'nav.videoCreator',
    icon: 'video',
    description: '숏폼, 업스케일, 이미지→비디오',
    descKey: 'nav.videoCreatorDesc'
  },
  {
    path: '/storyboard',
    label: '스토리보드',
    labelKey: 'nav.aiStoryboard',
    icon: 'book',
    description: 'AI 스토리보드 생성',
    descKey: 'nav.aiStoryboardDesc'
  },
];

/**
 * Community menu items
 */
export const COMMUNITY_MENU_ITEMS = [
  {
    path: '/announcements',
    label: '공지사항',
    labelKey: 'nav.announcements',
    icon: 'megaphone',
    description: '공지사항 및 업데이트',
    descKey: 'nav.announcementsDesc'
  },
  {
    path: '/free-board',
    label: '자유게시판',
    labelKey: 'nav.freeBoard',
    icon: 'chat',
    description: '자유로운 이야기',
    descKey: 'nav.freeBoardDesc'
  },
  {
    path: '/news',
    label: '뉴스',
    labelKey: 'nav.news',
    icon: 'news',
    description: '최신 뉴스',
    descKey: 'nav.newsDesc'
  },
  {
    path: '/briefing',
    label: '브리핑',
    labelKey: 'nav.briefing',
    icon: 'mic',
    description: 'AI 뉴스 브리핑',
    descKey: 'nav.briefingDesc'
  },
  {
    path: '/games',
    label: '게임',
    labelKey: 'nav.games',
    icon: 'gamepad',
    description: '미니 게임',
    descKey: 'nav.gamesDesc'
  },
  {
    path: '/youtube-trends',
    label: 'YouTube 트렌드',
    labelKey: 'nav.youtubeTrends',
    icon: 'trendingUp',
    description: 'AI 기반 트렌드 분석',
    descKey: 'nav.youtubeTrendsDesc'
  },
];

/**
 * Family menu items
 */
export const FAMILY_MENU_ITEMS = [
  {
    path: '/',
    label: '가족 공간',
    labelKey: 'nav.familyHome',
    icon: 'home',
    description: '가족 공간 홈',
    descKey: 'nav.familyHomeDesc'
  },
  {
    path: '/calendar',
    label: '캘린더',
    labelKey: 'nav.calendar',
    icon: 'calendar',
    description: '가족 일정 관리',
    descKey: 'nav.calendarDesc'
  },
];

/**
 * Lab menu items
 */
export const LAB_MENU_ITEMS = [
  {
    path: '/test-zone',
    label: '테스트 존',
    labelKey: 'nav.testZone',
    icon: 'flask',
    description: '실험 기능 테스트',
    descKey: 'nav.testZoneDesc'
  },
  {
    path: '/file-upload',
    label: '파일 업로드',
    labelKey: 'nav.fileUpload',
    icon: 'upload',
    description: '파일 업로드 관리',
    descKey: 'nav.fileUploadDesc'
  },
  {
    path: 'https://devteam.ilouli.com',
    label: 'AI 개발팀',
    labelKey: 'nav.devteam',
    icon: 'code',
    description: 'AI 개발팀 시스템',
    descKey: 'nav.devteamDesc',
    external: true
  },
  {
    path: 'https://claude.ilouli.com',
    label: 'Claude',
    labelKey: 'nav.claude',
    icon: 'terminal',
    description: 'Claude Code 웹 터미널',
    descKey: 'nav.claudeDesc',
    external: true
  },
  {
    path: 'https://markdown.ilouli.com',
    label: 'Markdown',
    labelKey: 'nav.markdown',
    icon: 'document',
    description: '마크다운 에디터',
    descKey: 'nav.markdownDesc',
    external: true
  },
];

/**
 * Stock/Finance menu items (재테크)
 */
export const STOCK_MENU_ITEMS = [
  {
    path: '/',
    label: '홈',
    labelKey: 'nav.stockHome',
    icon: 'home',
    description: '주식 홈',
    descKey: 'nav.stockHomeDesc'
  },
  {
    path: 'https://stockanalysis.ilouli.com',
    label: '종목분석',
    labelKey: 'nav.stockAnalysis',
    icon: 'chart',
    description: '뉴스 기반 종목 분석',
    descKey: 'nav.stockAnalysisDesc',
    external: true
  },
];

/**
 * Work menu items (3D Animation Collaboration)
 */
export const WORK_MENU_ITEMS = [
  {
    path: '/dashboard',
    label: '대시보드',
    labelKey: 'nav.workDashboard',
    icon: 'dashboard',
    description: '프로젝트 현황',
    descKey: 'nav.workDashboardDesc'
  },
  {
    path: '/projects',
    label: '프로젝트',
    labelKey: 'nav.workProjects',
    icon: 'folder',
    description: '프로젝트 관리',
    descKey: 'nav.workProjectsDesc'
  },
];

/**
 * Get full URL for menu item
 * @param {string} host - Host type (HOSTS.AI, HOSTS.COMMUNITY, etc.)
 * @param {string} path - Path
 * @returns {string} Full URL
 */
export const getMenuUrl = (host, path) => {
  return getHostUrl(host, path);
};

/**
 * Get menu items by host
 * @param {string} host - Host type
 * @returns {Array} Menu items
 */
export const getMenuItemsByHost = (host) => {
  switch (host) {
    case HOSTS.AI:
      return AI_MENU_ITEMS;
    case HOSTS.COMMUNITY:
      return COMMUNITY_MENU_ITEMS;
    case HOSTS.FAMILY:
      return FAMILY_MENU_ITEMS;
    case HOSTS.LAB:
      return LAB_MENU_ITEMS;
    case HOSTS.STOCK:
      return STOCK_MENU_ITEMS;
    case HOSTS.WORK:
      return WORK_MENU_ITEMS;
    default:
      return [];
  }
};
