import { openDB as idbOpenDB, type IDBPDatabase } from "idb"
import type { DBSchema } from "idb"

// ============================================================================
// INTERFACES
// ============================================================================

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  bio?: string
  website?: string
  followers: string[]
  following: string[]
  createdAt: number
  settings?: {
    language?: string
    theme?: "light" | "dark"
    profilePrivate?: boolean
    allowMessages?: "everyone" | "following" | "none"
    notificationsEnabled?: boolean
    emailNotifications?: boolean
  }
}

export interface ClothingItem {
  id: string
  userId: string
  name: string
  category: string
  color: string
  imageUrl: string
  season: string[]
  createdAt: number
}

export interface Outfit {
  id: string
  userId: string
  name: string
  items: string[]
  occasion: string
  season: string
  isFavorite: boolean
  createdAt: number
}

export interface SocialPost {
  id: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  imageUrl?: string
  likes: string[]
  comments: Comment[]
  createdAt: number
}

export interface Comment {
  id: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  createdAt: number
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  createdAt: number
  read: boolean
}

export interface Conversation {
  id: string
  participants: string[]
  lastMessage?: string
  lastMessageTime: number
  createdAt: number
}

export interface Notification {
  id: string
  userId: string
  type: "like" | "comment" | "follow" | "message"
  fromUserId: string
  fromUserName: string
  fromUserAvatar: string
  content: string
  read: boolean
  createdAt: number
}

export interface Story {
  id: string
  userId: string
  userName: string
  userAvatar: string
  imageUrl: string
  caption?: string
  filter?: string
  music?: string
  closeFriends?: boolean
  viewers: string[]
  createdAt: number
  expiresAt: number
}

export interface StoryGroup {
  userId: string
  userName: string
  userAvatar: string
  stories: Story[]
  hasUnviewed: boolean
}

export interface Order {
  id: string
  userId: string
  items: CartItem[]
  totalPrice: number
  status: "pending" | "paid" | "shipped" | "delivered"
  createdAt: number
  email: string
  address: string
}

export interface CartItem {
  id: string
  productId: string
  productName: string
  productBrand: string
  productPrice: number
  productImage: string
  productColor: string
  quantity: number
  size?: string
}

export interface Product {
  id: string
  name: string
  brand: string
  category: string
  description: string
  price: number
  discountPrice?: number
  colors: string[]
  sizes: {
    size: string
    stock: number
  }[]
  images: string[]
  material?: string
  careInstructions?: string
  isActive: boolean
  createdAt: number
}

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

interface GardıropDB extends DBSchema {
  users: {
    key: string
    value: User
  }
  clothes: {
    key: string
    value: ClothingItem
  }
  outfits: {
    key: string
    value: Outfit
  }
  social_posts: {
    key: string
    value: SocialPost
  }
  messages: {
    key: string
    value: Message
  }
  conversations: {
    key: string
    value: Conversation
  }
  notifications: {
    key: string
    value: Notification
  }
  stories: {
    key: string
    value: Story
  }
  orders: {
    key: string
    value: Order
  }
  products: {
    key: string
    value: Product
  }
}

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

export async function openDB(): Promise<IDBPDatabase<GardıropDB>> {
  return await idbOpenDB<GardıropDB>("gardirop-db", 6, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("users")) {
        db.createObjectStore("users", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("clothes")) {
        db.createObjectStore("clothes", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("outfits")) {
        db.createObjectStore("outfits", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("social_posts")) {
        db.createObjectStore("social_posts", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("messages")) {
        db.createObjectStore("messages", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("conversations")) {
        db.createObjectStore("conversations", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("notifications")) {
        db.createObjectStore("notifications", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("stories")) {
        db.createObjectStore("stories", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("orders")) {
        db.createObjectStore("orders", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("products")) {
        db.createObjectStore("products", { keyPath: "id" })
      }
    },
  })
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

export async function createOrUpdateUser(user: User): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("users", "readwrite")
  const store = tx.objectStore("users")
  await store.put(user)
  await tx.done
  db.close()
}

export async function getUser(userId: string): Promise<User | undefined> {
  const db = await openDB()
  const tx = db.transaction("users", "readonly")
  const store = tx.objectStore("users")
  const user = await store.get(userId)
  await tx.done
  db.close()
  return user
}

export async function getAllUsers(): Promise<User[]> {
  const db = await openDB()
  const tx = db.transaction("users", "readonly")
  const store = tx.objectStore("users")
  const users = await store.getAll()
  await tx.done
  db.close()
  return users
}

export async function updateUser(user: User): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("users", "readwrite")
  const store = tx.objectStore("users")
  await store.put(user)
  await tx.done
  db.close()
}

export async function followUser(currentUserId: string, targetUserId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("users", "readwrite")
  const store = tx.objectStore("users")

  const currentUser = await store.get(currentUserId)
  const targetUser = await store.get(targetUserId)

  if (currentUser && targetUser) {
    if (!currentUser.following.includes(targetUserId)) {
      currentUser.following.push(targetUserId)
      await store.put(currentUser)
    }

    if (!targetUser.followers.includes(currentUserId)) {
      targetUser.followers.push(currentUserId)
      await store.put(targetUser)
    }
  }

  await tx.done
  db.close()
}

export async function unfollowUser(currentUserId: string, targetUserId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("users", "readwrite")
  const store = tx.objectStore("users")

  const currentUser = await store.get(currentUserId)
  const targetUser = await store.get(targetUserId)

  if (currentUser && targetUser) {
    currentUser.following = currentUser.following.filter((id) => id !== targetUserId)
    await store.put(currentUser)

    targetUser.followers = targetUser.followers.filter((id) => id !== currentUserId)
    await store.put(targetUser)
  }

  await tx.done
  db.close()
}
export async function isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
  const db = await openDB()
  const tx = db.transaction("users", "readonly")
  const store = tx.objectStore("users")
  const currentUser = await store.get(currentUserId)
  await tx.done
  db.close()
  
  if (!currentUser) return false
  return currentUser.following.includes(targetUserId)
}
// ============================================================================
// CLOTHING OPERATIONS
// ============================================================================

export async function addClothingItem(item: ClothingItem): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("clothes", "readwrite")
  const store = tx.objectStore("clothes")
  await store.add(item)
  await tx.done
  db.close()
}

export async function getAllClothes(userId: string): Promise<ClothingItem[]> {
  const db = await openDB()
  const tx = db.transaction("clothes", "readonly")
  const store = tx.objectStore("clothes")
  const allClothes = await store.getAll()
  await tx.done
  db.close()
  return allClothes.filter((item) => item.userId === userId)
}

export async function deleteClothingItem(itemId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("clothes", "readwrite")
  const store = tx.objectStore("clothes")
  await store.delete(itemId)
  await tx.done
  db.close()
}

// ============================================================================
// OUTFIT OPERATIONS
// ============================================================================

export async function saveOutfit(outfit: Outfit): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("outfits", "readwrite")
  const store = tx.objectStore("outfits")
  await store.add(outfit)
  await tx.done
  db.close()
}

export async function getAllOutfits(userId: string): Promise<Outfit[]> {
  const db = await openDB()
  const tx = db.transaction("outfits", "readonly")
  const store = tx.objectStore("outfits")
  const allOutfits = await store.getAll()
  await tx.done
  db.close()
  return allOutfits.filter((outfit) => outfit.userId === userId)
}

export async function toggleFavoriteOutfit(outfitId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("outfits", "readwrite")
  const store = tx.objectStore("outfits")
  const outfit = await store.get(outfitId)

  if (outfit) {
    outfit.isFavorite = !outfit.isFavorite
    await store.put(outfit)
  }

  await tx.done
  db.close()
}

export async function deleteOutfit(outfitId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("outfits", "readwrite")
  const store = tx.objectStore("outfits")
  await store.delete(outfitId)
  await tx.done
  db.close()
}

// ============================================================================
// SOCIAL POST OPERATIONS
// ============================================================================

export async function createPost(post: SocialPost): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("social_posts", "readwrite")
  const store = tx.objectStore("social_posts")
  await store.add(post)
  await tx.done
  db.close()
}

export async function getAllPosts(): Promise<SocialPost[]> {
  const db = await openDB()
  const tx = db.transaction("social_posts", "readonly")
  const store = tx.objectStore("social_posts")
  const posts = await store.getAll()
  await tx.done
  db.close()
  return posts.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getNonFollowingPosts(currentUserId: string): Promise<SocialPost[]> {
  const db = await openDB()
  const tx = db.transaction(["social_posts", "users"], "readonly")
  const postStore = tx.objectStore("social_posts")
  const userStore = tx.objectStore("users")
  
  const allPosts = await postStore.getAll()
  const currentUser = await userStore.get(currentUserId)
  
  await tx.done
  db.close()
  
  if (!currentUser) return []
  
  return allPosts
    .filter(post => 
      post.userId !== currentUserId && 
      !currentUser.following.includes(post.userId)
    )
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function likePost(postId: string, userId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("social_posts", "readwrite")
  const store = tx.objectStore("social_posts")
  const post = await store.get(postId)

  if (post) {
    if (!post.likes.includes(userId)) {
      post.likes.push(userId)
      await store.put(post)
    }
  }

  await tx.done
  db.close()
}

export async function unlikePost(postId: string, userId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("social_posts", "readwrite")
  const store = tx.objectStore("social_posts")
  const post = await store.get(postId)

  if (post) {
    post.likes = post.likes.filter((id) => id !== userId)
    await store.put(post)
  }

  await tx.done
  db.close()
}

export async function addComment(postId: string, comment: Comment): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("social_posts", "readwrite")
  const store = tx.objectStore("social_posts")
  const post = await store.get(postId)

  if (post) {
    post.comments.push(comment)
    await store.put(post)
  }

  await tx.done
  db.close()
}

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

export async function sendMessage(message: Message): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(["messages", "conversations"], "readwrite")
  const messageStore = tx.objectStore("messages")
  const conversationStore = tx.objectStore("conversations")

  await messageStore.add(message)

  const conversation = await conversationStore.get(message.conversationId)
  if (conversation) {
    conversation.lastMessage = message.content
    conversation.lastMessageTime = message.createdAt
    await conversationStore.put(conversation)
  }

  await tx.done
  db.close()
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const db = await openDB()
  const tx = db.transaction("messages", "readonly")
  const store = tx.objectStore("messages")
  const allMessages = await store.getAll()
  await tx.done
  db.close()
  return allMessages
    .filter((msg) => msg.conversationId === conversationId)
    .sort((a, b) => a.createdAt - b.createdAt)
}

export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const db = await openDB()
  const tx = db.transaction("conversations", "readonly")
  const store = tx.objectStore("conversations")
  const allConversations = await store.getAll()
  await tx.done
  db.close()
  return allConversations
    .filter((conv) => conv.participants.includes(userId))
    .sort((a, b) => b.lastMessageTime - a.lastMessageTime)
}

export async function createConversation(conversation: Conversation): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("conversations", "readwrite")
  const store = tx.objectStore("conversations")
  await store.add(conversation)
  await tx.done
  db.close()
}

export async function getConversation(conversationId: string): Promise<Conversation | undefined> {
  const db = await openDB()
  const tx = db.transaction("conversations", "readonly")
  const store = tx.objectStore("conversations")
  const conversation = await store.get(conversationId)
  await tx.done
  db.close()
  return conversation
}
export async function markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("messages", "readwrite")
  const store = tx.objectStore("messages")
  const allMessages = await store.getAll()

  for (const message of allMessages) {
    if (message.conversationId === conversationId && 
        message.senderId !== userId && 
        !message.read) {
      message.read = true
      await store.put(message)
    }
  }

  await tx.done
  db.close()
}
// ============================================================================
// NOTIFICATION OPERATIONS
// ============================================================================

export async function createNotification(notification: Notification): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("notifications", "readwrite")
  const store = tx.objectStore("notifications")
  await store.add(notification)
  await tx.done
  db.close()
}

export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const db = await openDB()
  const tx = db.transaction("notifications", "readonly")
  const store = tx.objectStore("notifications")
  const allNotifications = await store.getAll()
  await tx.done
  db.close()
  return allNotifications
    .filter((notif) => notif.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const db = await openDB()
  const tx = db.transaction("notifications", "readonly")
  const store = tx.objectStore("notifications")
  const allNotifications = await store.getAll()
  await tx.done
  db.close()
  
  return allNotifications.filter(
    (notif) => notif.userId === userId && !notif.read
  ).length
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("notifications", "readwrite")
  const store = tx.objectStore("notifications")
  const notification = await store.get(notificationId)

  if (notification) {
    notification.read = true
    await store.put(notification)
  }

  await tx.done
  db.close()
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("notifications", "readwrite")
  const store = tx.objectStore("notifications")
  const allNotifications = await store.getAll()

  for (const notification of allNotifications) {
    if (notification.userId === userId && !notification.read) {
      notification.read = true
      await store.put(notification)
    }
  }

  await tx.done
  db.close()
}

// ============================================================================
// STORY OPERATIONS
// ============================================================================

export async function createStory(story: Story): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("stories", "readwrite")
  const store = tx.objectStore("stories")
  await store.add(story)
  await tx.done
  db.close()
}

export async function getStoryGroups(currentUserId: string): Promise<StoryGroup[]> {
  const db = await openDB()
  const tx = db.transaction("stories", "readonly")
  const store = tx.objectStore("stories")
  const allStories = await store.getAll()
  await tx.done
  db.close()

  const now = Date.now()
  const activeStories = allStories.filter((story) => story.expiresAt > now)

  const groupsMap = new Map<string, StoryGroup>()

  for (const story of activeStories) {
    if (!groupsMap.has(story.userId)) {
      groupsMap.set(story.userId, {
        userId: story.userId,
        userName: story.userName,
        userAvatar: story.userAvatar,
        stories: [],
        hasUnviewed: false,
      })
    }

    const group = groupsMap.get(story.userId)!
    group.stories.push(story)

    if (!story.viewers.includes(currentUserId)) {
      group.hasUnviewed = true
    }
  }

  return Array.from(groupsMap.values()).sort((a, b) => {
    if (a.hasUnviewed && !b.hasUnviewed) return -1
    if (!a.hasUnviewed && b.hasUnviewed) return 1
    return b.stories[0].createdAt - a.stories[0].createdAt
  })
}

export async function markStoryAsViewed(storyId: string, userId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("stories", "readwrite")
  const store = tx.objectStore("stories")
  const story = await store.get(storyId)

  if (story && !story.viewers.includes(userId)) {
    story.viewers.push(userId)
    await store.put(story)
  }

  await tx.done
  db.close()
}

export async function cleanExpiredStories(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("stories", "readwrite")
  const store = tx.objectStore("stories")
  const allStories = await store.getAll()

  const now = Date.now()
  for (const story of allStories) {
    if (story.expiresAt <= now) {
      await store.delete(story.id)
    }
  }

  await tx.done
  db.close()
}

export async function deleteStory(storyId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("stories", "readwrite")
  const store = tx.objectStore("stories")
  await store.delete(storyId)
  await tx.done
  db.close()
}
export async function getUserStories(userId: string): Promise<Story[]> {
  const db = await openDB()
  const tx = db.transaction("stories", "readonly")
  const store = tx.objectStore("stories")
  const allStories = await store.getAll()
  await tx.done
  db.close()

  const now = Date.now()
  return allStories
    .filter(story => story.userId === userId && story.expiresAt > now)
    .sort((a, b) => b.createdAt - a.createdAt)
}
// ============================================================================
// CART OPERATIONS
// ============================================================================

export async function getCart(userId: string): Promise<CartItem[]> {
  if (typeof window === 'undefined') return []
  
  const cartKey = `cart_${userId}`
  const cartData = localStorage.getItem(cartKey)
  return cartData ? JSON.parse(cartData) : []
}

export async function addToCart(userId: string, item: CartItem): Promise<void> {
  const cart = await getCart(userId)
  const existingItem = cart.find(i => i.productId === item.productId)
  
  if (existingItem) {
    existingItem.quantity += 1
  } else {
    cart.push({ ...item, quantity: 1 })
  }
  
  const cartKey = `cart_${userId}`
  localStorage.setItem(cartKey, JSON.stringify(cart))
}

export async function removeFromCart(userId: string, productId: string): Promise<void> {
  let cart = await getCart(userId)
  cart = cart.filter(item => item.productId !== productId)
  
  const cartKey = `cart_${userId}`
  localStorage.setItem(cartKey, JSON.stringify(cart))
}

export async function updateCartQuantity(userId: string, productId: string, quantity: number): Promise<void> {
  const cart = await getCart(userId)
  const item = cart.find(i => i.productId === productId)
  
  if (item) {
    item.quantity = Math.max(1, quantity)
  }
  
  const cartKey = `cart_${userId}`
  localStorage.setItem(cartKey, JSON.stringify(cart))
}

export async function clearCart(userId: string): Promise<void> {
  const cartKey = `cart_${userId}`
  localStorage.removeItem(cartKey)
}

// ============================================================================
// ORDER OPERATIONS
// ============================================================================

export async function createOrder(order: Order): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("orders", "readwrite")
  const store = tx.objectStore("orders")
  await store.add(order)
  await tx.done
  db.close()
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  const db = await openDB()
  const tx = db.transaction("orders", "readonly")
  const store = tx.objectStore("orders")
  const allOrders = await store.getAll()
  await tx.done
  db.close()
  
  return allOrders
    .filter(order => order.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt)
}

// ============================================================================
// PRODUCT OPERATIONS
// ============================================================================

export async function addProduct(product: Product): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("products", "readwrite")
  const store = tx.objectStore("products")
  await store.add(product)
  await tx.done
  db.close()
}

export async function updateProduct(product: Product): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("products", "readwrite")
  const store = tx.objectStore("products")
  await store.put(product)
  await tx.done
  db.close()
}

export async function deleteProduct(productId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction("products", "readwrite")
  const store = tx.objectStore("products")
  await store.delete(productId)
  await tx.done
  db.close()
}

export async function getAllProducts(): Promise<Product[]> {
  const db = await openDB()
  const tx = db.transaction("products", "readonly")
  const store = tx.objectStore("products")
  const products = await store.getAll()
  await tx.done
  db.close()
  return products.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getProduct(productId: string): Promise<Product | undefined> {
  const db = await openDB()
  const tx = db.transaction("products", "readonly")
  const store = tx.objectStore("products")
  const product = await store.get(productId)
  await tx.done
  db.close()
  return product
}

// ============================================================================
// ALIASES (Geriye uyumluluk için)
// ============================================================================

export const toggleFavorite = toggleFavoriteOutfit
export const addStory = createStory
export const addCommentToPost = addComment
export const getAllSocialPosts = getAllPosts