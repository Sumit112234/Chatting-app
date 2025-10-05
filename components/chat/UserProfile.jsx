"use client"

// User profile settings modal
import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera } from "lucide-react"
import { updateUser } from "@/lib/firestore"

export default function UserProfile({ onClose }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    displayName: user?.displayName || "",
    status: user?.status || "Hey there! I am using ChatApp.",
    email: user?.email || "",
  })

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)


    try {
      
      console.log("Updating profile:", formData)
      
      await updateUser(user.uid, formData)
      onClose()
    } catch (error) {
      console.error("Error updating profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
          <DialogDescription>Update your profile information and status message.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user?.photoURL || "/placeholder.svg"} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Button type="button" size="sm" className="absolute bottom-0 right-0 h-8 w-8 rounded-full p-0">
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Click to change profile picture</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                placeholder="Enter your display name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={formData.email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status Message</Label>
              <Textarea
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                placeholder="Enter your status message"
                rows={3}
                maxLength={139}
              />
              <p className="text-xs text-muted-foreground text-right">{formData.status.length}/139</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
