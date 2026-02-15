import { Compass, MessageCircle, Home, Bell, User, ShoppingBag } from 'lucide-react'

export interface Screen {
  path: string
  label: string
  labelKey: string
  icon: typeof Compass
  index: number
  authRequired: boolean
}

// Yatay şerit sırası: Explore ←← Messages ← HOME → Notifications →→ Profile
export const SCREENS: Screen[] = [
  { path: '/explore', label: 'Explore', labelKey: 'explore', icon: Compass, index: 0, authRequired: false },
  { path: '/messages', label: 'Messages', labelKey: 'messages', icon: MessageCircle, index: 1, authRequired: true },
  { path: '/', label: 'Home', labelKey: 'home', icon: Home, index: 2, authRequired: false },
  { path: '/notifications', label: 'Notifications', labelKey: 'notifications', icon: Bell, index: 3, authRequired: true },
  { path: '/profile', label: 'Profile', labelKey: 'profile', icon: User, index: 4, authRequired: true },
]

export const STORE_SCREEN = {
  path: '/store',
  label: 'Store',
  labelKey: 'store',
  icon: ShoppingBag,
  authRequired: false,
}

export const HOME_INDEX = 2
export const SWIPE_THRESHOLD = 80 // px
export const VELOCITY_THRESHOLD = 0.5 // px/ms
export const DEADZONE = 10 // px - axis lock deadzone
export const DOUBLE_SWIPE_WINDOW = 500 // ms - double swipe detection window

export type SwipeDirection = 'left' | 'right' | 'up' | 'down'

export function getScreenByIndex(index: number): Screen | undefined {
  return SCREENS[index]
}

export function getCurrentIndex(path: string): number {
  const screen = SCREENS.find(s => s.path === path)
  return screen ? screen.index : HOME_INDEX
}

export function isMainScreen(path: string): boolean {
  return SCREENS.some(s => s.path === path) || path === STORE_SCREEN.path
}

export function canSwipeLeft(currentIndex: number): boolean {
  return currentIndex > 0
}

export function canSwipeRight(currentIndex: number): boolean {
  return currentIndex < SCREENS.length - 1
}

export function getLeftScreen(currentIndex: number): Screen | undefined {
  if (!canSwipeLeft(currentIndex)) return undefined
  return SCREENS[currentIndex - 1]
}

export function getRightScreen(currentIndex: number): Screen | undefined {
  if (!canSwipeRight(currentIndex)) return undefined
  return SCREENS[currentIndex + 1]
}
