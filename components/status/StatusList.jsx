"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getAllActiveStatuses, getUserStatuses } from "@/lib/status"
import { useAuth } from "@/contexts/AuthContext"
import StatusModal from "./StatusModal"
import StatusViewer from "./StatusViewer"

export default function StatusList() {
  const { user } = useAuth()
  const [allStatuses, setAllStatuses] = useState([])
  const [userStatuses, setUserStatuses] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewingStatuses, setViewingStatuses] = useState(null)
  const [viewingIndex, setViewingIndex] = useState(0)

  useEffect(() => {
    if (!user) return

    // Get all active statuses
    const unsubscribeAll = getAllActiveStatuses((snapshot) => {
      const statusesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // Group by user
      const groupedStatuses = statusesData.reduce((acc, status) => {
        if (!acc[status.userId]) {
          acc[status.userId] = []
        }
        acc[status.userId].push(status)
        return acc
      }, {})

      setAllStatuses(groupedStatuses)
    })

    // Get user's own statuses
    const unsubscribeUser = getUserStatuses(user.uid, (snapshot) => {
      const statusesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setUserStatuses(statusesData)
    })

    return () => {
      unsubscribeAll()
      unsubscribeUser()
    }
  }, [user])

  const handleStatusClick = (userId, statusIndex = 0) => {
    const statuses = allStatuses[userId] || []
    setViewingStatuses(statuses)
    setViewingIndex(statusIndex)
  }

  const hasUnviewedStatus = (statuses) => {
    return statuses.some((status) => !status.viewers?.some((viewer) => viewer.userId === user?.uid))
  }

  return (
    <div className="p-4 border-b border-gray-700">
      <h2 className="text-lg font-semibold text-white mb-4">Status</h2>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {/* User's own status */}
        <div className="flex flex-col items-center gap-2 min-w-[70px]">
          <div className="relative">
            <div
              className={`w-14 h-14 rounded-full border-2 ${
                userStatuses.length > 0 ? "border-teal-500" : "border-gray-600 border-dashed"
              } flex items-center justify-center cursor-pointer overflow-hidden`}
              onClick={() => {
                if (userStatuses.length > 0) {
                  handleStatusClick(user.uid)
                } else {
                  setShowCreateModal(true)
                }
              }}
            >
              {userStatuses.length > 0 ? (
                <img
                  src={user?.photoURL || "/default-avatar.png"}
                  alt="Your status"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Plus className="h-6 w-6 text-gray-400" />
              )}
            </div>
            {userStatuses.length === 0 && (
              <Button
                size="sm"
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-teal-600 hover:bg-teal-700 p-0"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>
          <span className="text-xs text-gray-300 text-center">
            {userStatuses.length > 0 ? "My Status" : "Add Status"}
          </span>
        </div>

        {/* Other users' statuses */}
        {Object.entries(allStatuses)
          .filter(([userId]) => userId !== user?.uid)
          .map(([userId, statuses]) => {
            const latestStatus = statuses[0]
            const unviewed = hasUnviewedStatus(statuses)

            return (
              <div key={userId} className="flex flex-col items-center gap-2 min-w-[70px]">
                <div
                  className={`w-14 h-14 rounded-full border-2 ${
                    unviewed ? "border-teal-500" : "border-gray-600"
                  } flex items-center justify-center cursor-pointer overflow-hidden`}
                  onClick={() => handleStatusClick(userId)}
                >
                  <img
                    src={latestStatus.userAvatar || "/default-avatar.png"}
                    alt={latestStatus.userName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-xs text-gray-300 text-center truncate w-full">{latestStatus.userName}</span>
              </div>
            )
          })}
      </div>

      <StatusModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />

      {viewingStatuses && (
        <StatusViewer
          statuses={viewingStatuses}
          initialIndex={viewingIndex}
          onClose={() => {
            setViewingStatuses(null)
            setViewingIndex(0)
          }}
        />
      )}
    </div>
  )
}
