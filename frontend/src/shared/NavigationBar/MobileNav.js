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
import { Icon } from '../Icons';

/**
 * 모바일 네비게이션 컴포넌트 (Tailwind CSS)
 */
const MobileNav = ({
  isOpen,
  showAIFeatures,
  showFamilySpace,
  showAdminLab,
  activeDropdown,
  onToggleMobileDropdown,
  onClose,
  isAuthenticated,
  onLogin
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const currentHost = getCurrentHost();

  const isActiveHost = (host) => currentHost === host;

  return (
    <>
      {/* 모바일 오버레이 */}
      <div
        className={`
          fixed inset-0 bg-black/30 z-[998] lg:hidden
          transition-opacity duration-300
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* 모바일 메뉴 패널 - 오른쪽에서 슬라이드 */}
      <nav
        className={`
          fixed top-0 right-0 bottom-0 w-72 max-w-[80vw] bg-white shadow-xl z-[999]
          transform transition-transform duration-300 ease-in-out
          lg:hidden overflow-y-auto
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200">
          <span className="text-lg font-semibold text-gray-900">메뉴</span>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="메뉴 닫기"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <ul className="flex flex-col py-2">
          {/* About */}
          <li>
            <a
              href={getHostUrl(HOSTS.MAIN, '/about')}
              className={`
                block px-4 py-3 text-gray-900 no-underline hover:bg-gray-50
                transition-colors duration-200
                ${currentHost === HOSTS.MAIN && location.pathname === '/about' ? 'text-blue-600 font-medium' : ''}
              `}
            >
              {t('nav.about')}
            </a>
          </li>

          {/* Community Dropdown */}
          <MobileDropdownItem
            name="community"
            isActive={isActiveHost(HOSTS.COMMUNITY)}
            isOpen={activeDropdown === 'community'}
            onToggle={onToggleMobileDropdown}
            label={t('nav.community')}
            items={COMMUNITY_MENU_ITEMS}
            host={HOSTS.COMMUNITY}
            t={t}
          />

          {/* AI Content Tools - 구독자 이상 */}
          {showAIFeatures && (
            <MobileDropdownItem
              name="ai"
              isActive={isActiveHost(HOSTS.AI)}
              isOpen={activeDropdown === 'ai'}
              onToggle={onToggleMobileDropdown}
              label={t('nav.aiContentTools')}
              items={AI_MENU_ITEMS}
              host={HOSTS.AI}
              t={t}
            />
          )}

          {/* Stock - 구독자 이상 */}
          {showAIFeatures && (
            <MobileDropdownItem
              name="stock"
              isActive={isActiveHost(HOSTS.STOCK)}
              isOpen={activeDropdown === 'stock'}
              onToggle={onToggleMobileDropdown}
              label={t('nav.stock')}
              items={STOCK_MENU_ITEMS}
              host={HOSTS.STOCK}
              t={t}
            />
          )}

          {/* Work - Family/Admin */}
          {showFamilySpace && (
            <MobileDropdownItem
              name="work"
              isActive={isActiveHost(HOSTS.WORK)}
              isOpen={activeDropdown === 'work'}
              onToggle={onToggleMobileDropdown}
              label={t('nav.work')}
              items={WORK_MENU_ITEMS}
              host={HOSTS.WORK}
              t={t}
            />
          )}

          {/* Family Space - Family/Admin */}
          {showFamilySpace && (
            <MobileDropdownItem
              name="family"
              isActive={isActiveHost(HOSTS.FAMILY)}
              isOpen={activeDropdown === 'family'}
              onToggle={onToggleMobileDropdown}
              label={t('nav.familySpace')}
              items={FAMILY_MENU_ITEMS}
              host={HOSTS.FAMILY}
              t={t}
            />
          )}

          {/* Admin Lab - Family/Admin */}
          {showAdminLab && (
            <MobileDropdownItem
              name="lab"
              isActive={isActiveHost(HOSTS.LAB)}
              isOpen={activeDropdown === 'lab'}
              onToggle={onToggleMobileDropdown}
              label={t('nav.adminLab')}
              items={LAB_MENU_ITEMS}
              host={HOSTS.LAB}
              t={t}
            />
          )}
        </ul>

        {/* 로그인 버튼 - 640px 미만에서만 표시 (sm:hidden) */}
        {!isAuthenticated && (
          <div className="sm:hidden px-4 py-3 border-t border-gray-100">
            <button
              onClick={() => { onClose(); onLogin(); }}
              className="w-full py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
            >
              {t('auth.login.button')}
            </button>
          </div>
        )}
      </nav>
    </>
  );
};

/**
 * 모바일 드롭다운 아이템 컴포넌트 (Tailwind CSS)
 */
const MobileDropdownItem = ({ name, isActive, isOpen, onToggle, label, items, host, t }) => (
  <li>
    <button
      className={`
        w-full text-left px-4 py-3 text-gray-900 hover:bg-gray-50
        flex items-center justify-between
        transition-colors duration-200
        ${isActive ? 'text-blue-600 font-medium' : ''}
      `}
      onClick={() => onToggle(name)}
    >
      {label}
      <svg
        className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <div
      className={`
        overflow-hidden transition-all duration-300 ease-in-out bg-gray-50
        ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
      `}
    >
      {items.map((item) => (
        <a
          key={item.path}
          href={getHostUrl(host, item.path)}
          className="flex items-center gap-2.5 px-8 py-2.5 text-gray-700 no-underline hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
          {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {item.icon && (
            <span className="flex-shrink-0 text-gray-400">
              <Icon name={item.icon} size={16} />
            </span>
          )}
          <span className="flex-1">{t(item.labelKey) || item.label}</span>
          {item.external && (
            <svg className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          )}
        </a>
      ))}
    </div>
  </li>
);

export default MobileNav;
