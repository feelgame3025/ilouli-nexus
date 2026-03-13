// 서브도메인 설정
export const HOSTS = {
  MAIN: 'main',
  AUTH: 'auth',
  AI: 'ai',
  COMMUNITY: 'community',
  FAMILY: 'family',
  ADMIN: 'admin',
  LAB: 'lab',
  STOCK: 'stock',
  WORK: 'work',
  NEWS: 'news',
  NEXUS: 'nexus'
};

// 도메인 설정 (프로덕션/개발 환경)
const DOMAIN = process.env.REACT_APP_DOMAIN || 'ilouli.com';
const DEV_PORT = 3000;

// 현재 호스트 감지
export const getCurrentHost = () => {
  const hostname = window.location.hostname;

  // 로컬 개발 환경
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // 쿼리 파라미터로 호스트 시뮬레이션 (?host=ai)
    const params = new URLSearchParams(window.location.search);
    const hostParam = params.get('host');
    if (hostParam && Object.values(HOSTS).includes(hostParam)) {
      return hostParam;
    }
    // ilouli-nexus 앱이므로 기본값은 NEXUS
    return HOSTS.NEXUS;
  }

  // 프로덕션 환경
  if (hostname === DOMAIN || hostname === `www.${DOMAIN}`) {
    return HOSTS.MAIN;
  }

  // 서브도메인 추출
  const subdomain = hostname.replace(`.${DOMAIN}`, '');

  switch (subdomain) {
    case 'auth':
      return HOSTS.AUTH;
    case 'ai':
      return HOSTS.AI;
    case 'community':
      return HOSTS.COMMUNITY;
    case 'family':
      return HOSTS.FAMILY;
    case 'admin':
      return HOSTS.ADMIN;
    case 'lab':
      return HOSTS.LAB;
    case 'stock':
      return HOSTS.STOCK;
    case 'work':
      return HOSTS.WORK;
    case 'news':
      return HOSTS.NEWS;
    case 'nexus':
      return HOSTS.NEXUS;
    default:
      return HOSTS.NEXUS;
  }
};

// 호스트별 URL 생성
export const getHostUrl = (host, path = '') => {
  // 이미 전체 URL인 경우 그대로 반환 (외부 링크)
  if (path && (path.startsWith('http://') || path.startsWith('https://'))) {
    return path;
  }

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // 로컬 개발 환경
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    if (host === HOSTS.NEXUS) {
      return `${protocol}//${hostname}:${DEV_PORT}${path}`;
    }
    return `${protocol}//${hostname}:${DEV_PORT}${path}?host=${host}`;
  }

  // 프로덕션 환경
  if (host === HOSTS.MAIN) {
    return `${protocol}//${DOMAIN}${path}`;
  }

  return `${protocol}//${host}.${DOMAIN}${path}`;
};

// 호스트 정보
export const HOST_INFO = {
  [HOSTS.MAIN]: {
    name: 'ilouli.com',
    title: 'ilouli.com',
    description: '창작, 연결, 그리고 유산'
  },
  [HOSTS.AUTH]: {
    name: '인증',
    title: 'Auth - ilouli.com',
    description: '로그인 및 계정 관리'
  },
  [HOSTS.AI]: {
    name: 'AI 기능',
    title: 'AI - ilouli.com',
    description: 'AI 기반 창작 도구'
  },
  [HOSTS.COMMUNITY]: {
    name: '커뮤니티',
    title: 'Community - ilouli.com',
    description: '아이디어를 공유하고 소통하세요'
  },
  [HOSTS.FAMILY]: {
    name: '가족 공간',
    title: 'Family - ilouli.com',
    description: '가족을 위한 프라이빗 공간'
  },
  [HOSTS.ADMIN]: {
    name: '관리자',
    title: 'Admin - ilouli.com',
    description: '관리자 대시보드'
  },
  [HOSTS.LAB]: {
    name: '관리자 랩',
    title: 'Lab - ilouli.com',
    description: '새로운 기능 테스트'
  },
  [HOSTS.STOCK]: {
    name: '주식',
    title: 'Stock - ilouli.com',
    description: '주식 투자를 더 쉽게'
  },
  [HOSTS.WORK]: {
    name: '워크',
    title: 'Work - ilouli.com',
    description: '3D 애니메이션 협업 플랫폼'
  },
  [HOSTS.NEWS]: {
    name: '뉴스',
    title: 'News - ilouli.com',
    description: '뉴스 기반 주식시장 인사이트'
  },
  [HOSTS.NEXUS]: {
    name: '넥서스',
    title: 'Nexus - ilouli.com',
    description: '지식 그래프 플랫폼'
  }
};

// 호스트별 필요 권한
export const HOST_REQUIRED_TIERS = {
  [HOSTS.MAIN]: null,
  [HOSTS.AUTH]: null,
  [HOSTS.AI]: ['subscriber', 'family', 'admin'],
  [HOSTS.COMMUNITY]: null,
  [HOSTS.FAMILY]: ['family', 'admin'],
  [HOSTS.ADMIN]: ['admin'],
  [HOSTS.LAB]: ['family', 'admin'],
  [HOSTS.STOCK]: null,
  [HOSTS.WORK]: ['family', 'admin'],
  [HOSTS.NEWS]: null,
  [HOSTS.NEXUS]: null
};
