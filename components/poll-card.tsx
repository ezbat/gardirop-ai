"use client"

import { useState } from "react"
import { MessageCircle, Send } from "lucide-react"
import Link from "next/link"

interface PollOption {
  id: string
  image_url: string
  caption: string | null
  vote_count: number
}

interface Poll {
  id: string
  user_id: string
  title: string
  description: string | null
  created_at: string
  user: {
    id: string
    name: string
    username: string | null
    avatar_url: string | null
  }
  options: PollOption[]
  totalVotes: number
  userVotedOptionId: string | null
  comments: any[]
}

interface PollCardProps {
  poll: Poll
  currentUserId: string
  onVote: (pollId: string, optionId: string) => void
  onComment: (pollId: string, comment: string) => void
}

export default function PollCard({ poll, currentUserId, onVote, onComment }: PollCardProps) {
  const [comment, setComment] = useState("")
  const [showComments, setShowComments] = useState(false)
  const [voting, setVoting] = useState(false)

  const handleVote = async (optionId: string) => {
    if (voting) return
    setVoting(true)
    await onVote(poll.id, optionId)
    setVoting(false)
  }

  const handleComment = async () => {
    if (!comment.trim() || voting) return
    setVoting(true)
    await onComment(poll.id, comment)
    setComment("")
    setVoting(false)
  }

  const getPercentage = (optionVoteCount: number) => {
    if (poll.totalVotes === 0) return 0
    return Math.round((optionVoteCount / poll.totalVotes) * 100)
  }

  return (
    <div className="glass border border-border rounded-2xl overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <Link href={poll.user_id === currentUserId ? '/profile' : `/profile/${poll.user_id}`} className="w-10 h-10 rounded-full overflow-hidden bg-primary hover:opacity-80 transition-opacity">
          {poll.user.avatar_url ? (
            <img src={poll.user.avatar_url} alt={poll.user.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold">{poll.user.name[0].toUpperCase()}</div>
          )}
        </Link>
        <div className="flex-1">
          <Link href={poll.user_id === currentUserId ? '/profile' : `/profile/${poll.user_id}`} className="font-bold hover:underline">{poll.user.name}</Link>
          <p className="text-xs text-muted-foreground">{new Date(poll.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</p>
        </div>
      </div>
      <div className="px-4 pb-4">
        <h3 className="text-lg font-bold mb-2">{poll.title}</h3>
        {poll.description && <p className="text-sm text-muted-foreground mb-4">{poll.description}</p>}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {poll.options.map((option) => {
            const percentage = getPercentage(option.vote_count)
            const isSelected = poll.userVotedOptionId === option.id
            const hasVoted = poll.userVotedOptionId !== null
            return (
              <button key={option.id} onClick={() => handleVote(option.id)} disabled={voting} className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${isSelected ? 'border-primary scale-95' : 'border-transparent hover:scale-95'} disabled:opacity-50`}>
                <img src={option.image_url} alt={option.caption || 'Option'} className="w-full h-full object-cover" />
                {hasVoted && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                    <p className="text-white text-3xl font-bold mb-1">{percentage}%</p>
                    <p className="text-white text-xs">{option.vote_count} oy</p>
                  </div>
                )}
                {option.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="text-white text-xs font-semibold">{option.caption}</p>
                  </div>
                )}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>
        {poll.totalVotes > 0 && <p className="text-sm text-muted-foreground mb-3">{poll.totalVotes} kişi oy verdi</p>}
        <div className="flex items-center gap-4 mb-3">
          <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 hover:text-primary transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">{poll.comments.length}</span>
          </button>
        </div>
        <div className="flex gap-2">
          <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Yorum yap..." maxLength={200} className="flex-1 px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary text-sm" onKeyPress={(e) => e.key === 'Enter' && handleComment()} />
          <button onClick={handleComment} disabled={!comment.trim() || voting} className="p-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
            <Send className="w-5 h-5" />
          </button>
        </div>
        {showComments && poll.comments.length > 0 && (
          <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
            {poll.comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <Link href={c.user_id === currentUserId ? '/profile' : `/profile/${c.user_id}`} className="w-8 h-8 rounded-full overflow-hidden bg-primary flex-shrink-0">
                  {c.user?.avatar_url ? (
                    <img src={c.user.avatar_url} alt={c.user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{c.user?.name?.[0]?.toUpperCase() || 'U'}</div>
                  )}
                </Link>
                <div className="flex-1">
                  <p className="text-sm">
                    <Link href={c.user_id === currentUserId ? '/profile' : `/profile/${c.user_id}`} className="font-bold hover:underline mr-2">{c.user?.name}</Link>
                    {c.comment}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString('tr-TR')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}