import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { getHostUrl, getCurrentHost, HOSTS } from '../../utils/hostConfig';
import {
  AI_MENU_ITEMS,
  COMMUNITY_MENU_ITEMS,
  FAMILY_MENU_ITEMS,
  LAB_MENU_ITEMS,
  STOCK_MENU_ITEMS,
  WORK_MENU_ITEMS
} from '../../config/menuConfig';
import NavDropdown from './NavDropdown';

/**
 * 데스크톱 네비게이션 컴포넌트
 * React Portal 기반 드롭다운 사용
 */
const DesktopNav = ({
  showAIFeatures,
  showFamilySpace,
  showAdminLab,
  navRef
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const currentHost = getCurrentHost();

  const isActiveHost = (host) => currentHost === host;

  return (
    <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 justify-center" ref={navRef}>
      <ul className="flex list-none m-0 p-0">
        {/* About - 드롭다운 없음 */}
        <li className="relative">
          <a
            href={getHostUrl(HOSTS.MAIN, '/about')}
            className={`flex items-center no-underline text-xs font-normal px-3 h-11 leading-[44px] bg-transparent border-none cursor-pointer whitespace-nowrap hover:text-blue-500 ${
              currentHost === HOSTS.MAIN && location.pathname === '/about'
                ? 'text-blue-500'
                : 'text-gray-900'
            }`}
          >
            {t('nav.about')}
          </a>
        </li>

        {/* Community - Portal 드롭다운 */}
        <NavDropdown
          label={t('nav.community')}
          items={COMMUNITY_MENU_ITEMS}
          host={HOSTS.COMMUNITY}
          isActive={isActiveHost(HOSTS.COMMUNITY)}
          t={t}
        />

        {/* AI Content Tools - Portal 드롭다운 */}
        {showAIFeatures && (
          <NavDropdown
            label={t('nav.aiContentTools')}
            items={AI_MENU_ITEMS}
            host={HOSTS.AI}
            isActive={isActiveHost(HOSTS.AI)}
            t={t}
          />
        )}

        {/* Stock - Portal 드롭다운 */}
        {showAIFeatures && (
          <NavDropdown
            label={t('nav.stock')}
            items={STOCK_MENU_ITEMS}
            host={HOSTS.STOCK}
            isActive={isActiveHost(HOSTS.STOCK)}
            t={t}
          />
        )}

        {/* Work - Portal 드롭다운 */}
        {showFamilySpace && (
          <NavDropdown
            label={t('nav.work')}
            items={WORK_MENU_ITEMS}
            host={HOSTS.WORK}
            isActive={isActiveHost(HOSTS.WORK)}
            t={t}
          />
        )}

        {/* Family Space - Portal 드롭다운 */}
        {showFamilySpace && (
          <NavDropdown
            label={t('nav.familySpace')}
            items={FAMILY_MENU_ITEMS}
            host={HOSTS.FAMILY}
            isActive={isActiveHost(HOSTS.FAMILY)}
            t={t}
          />
        )}

        {/* Admin Lab - Portal 드롭다운 */}
        {showAdminLab && (
          <NavDropdown
            label={t('nav.adminLab')}
            items={LAB_MENU_ITEMS}
            host={HOSTS.LAB}
            isActive={isActiveHost(HOSTS.LAB)}
            t={t}
          />
        )}
      </ul>
    </nav>
  );
};

export default DesktopNav;
