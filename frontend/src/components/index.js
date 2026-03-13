/**
 * Component exports stub for NavigationBar compatibility
 */
import React from 'react';

// LevelCard stub - full implementation in ilouli-main
export const LevelCard = ({ user }) => {
  if (!user) return null;
  const level = user.level || 1;
  return (
    <div className="px-4 py-3 bg-gray-50 rounded-lg mx-3 my-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">레벨</span>
        <span className="text-sm font-semibold text-blue-500">Lv.{level}</span>
      </div>
    </div>
  );
};
