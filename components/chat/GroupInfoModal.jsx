"use client"

// Group information and management modal
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Camera,
  Users,
  UserPlus,
  MoreVertical,
  Crown,
  UserMinus,
  LogOut,
  Settings,
  Copy,
  Shield,
  Clock,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import {
  updateGroupInfo,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
  updateGroupAvatar,
  makeGroupAdmin,
  getGroupMembers,
} from "@/lib/groups"
import { searchUsers } from "@/lib/firestore"
import { useToast } from "@/hooks/use-toast"

export default function GroupInfoModal({ isOpen, onClose, chat }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState([])
  const [groupInfo, setGroupInfo] = useState({
    name: chat?.groupName || "",
    description: chat?.groupDescription || "",
  })
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [searchTerm, setSearchTerm] = useState("")

  const isAdmin = chat?.groupAdmin === user?.uid
  const isGroup = chat?.isGroup

  // Load group members
  useEffect(() => {
    if (isOpen && isGroup && chat?.id) {
      loadMembers()
    }
  }, [isOpen, isGroup, chat?.id])

  const loadMembers = async () => {
    try {
      const memberDetails = await getGroupMembers(chat.id)
      setMembers(memberDetails)
    } catch (error) {
      console.error("Error loading members:", error)
      toast({
        title: "Error",
        description: "Failed to load group members",
        variant: "destructive",
      })
    }
  }

  const handleUpdateGroupInfo = async () => {
    if (!isAdmin) return

    setLoading(true)
    try {
      await updateGroupInfo(
        chat.id,
        {
          groupName: groupInfo.name,
          groupDescription: groupInfo.description,
        },
        user.uid,
      )

      toast({
        title: "Success",
        description: "Group information updated",
      })
    } catch (error) {
      console.error("Error updating group info:", error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !isAdmin) return

    setLoading(true)
    try {
      await updateGroupAvatar(chat.id, file, user.uid)
      toast({
        title: "Success",
        description: "Group avatar updated",
      })
    } catch (error) {
      console.error("Error updating avatar:", error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSearchUsers = async (term) => {
    if (!term.trim()) {
      setSearchResults([])
      return
    }

    try {
      const results = await searchUsers(term, user.uid)
      // Filter out existing members
      const memberIds = members.map((m) => m.id)
      const filteredResults = results.filter((user) => !memberIds.includes(user.id))
      setSearchResults(filteredResults)
    } catch (error) {
      console.error("Error searching users:", error)
    }
  }

  const handleAddMembers = async (userIds) => {
    if (!isAdmin) return

    setLoading(true)
    try {
      await addGroupMembers(chat.id, userIds, user.uid)
      await loadMembers()
      setShowAddMembers(false)
      setSearchTerm("")
      setSearchResults([])
      toast({
        title: "Success",
        description: "Members added to group",
      })
    } catch (error) {
      console.error("Error adding members:", error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!isAdmin) return

    setLoading(true)
    try {
      await removeGroupMember(chat.id, memberId, user.uid)
      await loadMembers()
      setShowRemoveConfirm(null)
      toast({
        title: "Success",
        description: "Member removed from group",
      })
    } catch (error) {
      console.error("Error removing member:", error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMakeAdmin = async (memberId) => {
    if (!isAdmin) return

    setLoading(true)
    try {
      await makeGroupAdmin(chat.id, memberId, user.uid)
      await loadMembers()
      toast({
        title: "Success",
        description: "Admin rights transferred",
      })
    } catch (error) {
      console.error("Error making admin:", error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveGroup = async () => {
    setLoading(true)
    try {
      await leaveGroup(chat.id, user.uid)
      onClose()
      toast({
        title: "Success",
        description: "Left the group",
      })
    } catch (error) {
      console.error("Error leaving group:", error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setShowLeaveConfirm(false)
    }
  }

  const copyGroupLink = () => {
    // In a real app, this would copy a group invite link
    navigator.clipboard.writeText(`Group: ${chat.groupName}`)
    toast({
      title: "Copied",
      description: "Group information copied to clipboard",
    })
  }

  if (!isGroup) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Group Info</span>
            </DialogTitle>
            <DialogDescription>Manage group settings and members</DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6">
              {/* Group Avatar and Basic Info */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={chat.groupAvatar || "/placeholder.svg"} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {chat.groupName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {isAdmin && (
                    <label className="absolute bottom-0 right-0 cursor-pointer">
                      <Button size="sm" className="h-8 w-8 rounded-full p-0">
                        <Camera className="h-4 w-4" />
                      </Button>
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </label>
                  )}
                </div>

                <div className="text-center">
                  <h3 className="text-xl font-semibold">{chat.groupName}</h3>
                  <p className="text-sm text-muted-foreground">{members.length} members</p>
                </div>
              </div>

              {/* Group Settings */}
              {isAdmin && (
                <div className="space-y-4">
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center space-x-2">
                      <Settings className="h-4 w-4" />
                      <span>Group Settings</span>
                    </h4>

                    <div className="space-y-2">
                      <Label htmlFor="groupName">Group Name</Label>
                      <Input
                        id="groupName"
                        value={groupInfo.name}
                        onChange={(e) => setGroupInfo((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter group name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="groupDescription">Description</Label>
                      <Textarea
                        id="groupDescription"
                        value={groupInfo.description}
                        onChange={(e) => setGroupInfo((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter group description"
                        rows={3}
                      />
                    </div>

                    <Button onClick={handleUpdateGroupInfo} disabled={loading} className="w-full">
                      {loading ? "Updating..." : "Update Group Info"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Members Section */}
              <div className="space-y-4">
                <Separator />
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Members ({members.length})</span>
                  </h4>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={copyGroupLink}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                    {isAdmin && (
                      <Button variant="outline" size="sm" onClick={() => setShowAddMembers(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Members
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.photoURL || "/placeholder.svg"} />
                        <AvatarFallback>{member.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium truncate">{member.displayName}</p>
                          {member.isAdmin && (
                            <Badge variant="secondary" className="text-xs">
                              <Crown className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>{member.email}</span>
                          {member.isOnline ? (
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">
                              Online
                            </Badge>
                          ) : (
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>Last seen {member.lastSeen?.toDate()?.toLocaleString() || "Unknown"}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {isAdmin && member.id !== user.uid && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!member.isAdmin && (
                              <DropdownMenuItem onClick={() => handleMakeAdmin(member.id)}>
                                <Shield className="mr-2 h-4 w-4" />
                                Make Admin
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setShowRemoveConfirm(member)} className="text-destructive">
                              <UserMinus className="mr-2 h-4 w-4" />
                              Remove from Group
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Leave Group */}
              <div className="space-y-4">
                <Separator />
                <Button variant="destructive" onClick={() => setShowLeaveConfirm(true)} className="w-full">
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave Group
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add Members Modal */}
      <Dialog open={showAddMembers} onOpenChange={setShowAddMembers}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Members</DialogTitle>
            <DialogDescription>Search and add new members to the group</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Users</Label>
              <Input
                id="search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  handleSearchUsers(e.target.value)
                }}
                placeholder="Search by name..."
              />
            </div>

            <ScrollArea className="h-48">
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No users found" : "Start typing to search"}
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((searchUser) => (
                    <div
                      key={searchUser.id}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                      onClick={() => handleAddMembers([searchUser.id])}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={searchUser.photoURL || "/placeholder.svg"} />
                        <AvatarFallback>{searchUser.displayName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{searchUser.displayName}</p>
                        <p className="text-sm text-muted-foreground">{searchUser.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Group Confirmation */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this group?{" "}
              {isAdmin && "As the admin, admin rights will be transferred to another member."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveGroup} className="bg-destructive text-destructive-foreground">
              Leave Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!showRemoveConfirm} onOpenChange={() => setShowRemoveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {showRemoveConfirm?.displayName} from the group?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleRemoveMember(showRemoveConfirm.id)}
              className="bg-destructive text-destructive-foreground"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
