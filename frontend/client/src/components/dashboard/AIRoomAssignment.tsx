import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RefreshCw, ArrowRightLeft, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useStore } from "@/lib/store";

interface SuggestionResponse {
  suggestedRoom: {
    roomNumber: string;
    roomType: string;
    floor: number;
    rate: number;
    reason: string;
  } | null;
  alternatives: Array<{
    roomNumber: string;
    roomType: string;
    reason: string;
  }>;
  notes: string;
}

export default function AIRoomAssignment() {
  const [guestName, setGuestName] = useState("");
  const [preferences, setPreferences] = useState("");
  const [data, setData] = useState<SuggestionResponse | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const mutation = trpc.ai.roomAssignment.useMutation();
  const { rooms } = useStore();

  const roomTypes = useMemo(() => {
    const types: string[] = [];
    rooms.forEach((r: any) => {
      if (!types.includes(r.type)) types.push(r.type);
    });
    return types;
  }, [rooms]);

  const handleSuggest = async () => {
    if (!guestName.trim()) {
      toast.error("Please enter a guest name");
      return;
    }
    try {
      const result = await mutation.mutateAsync({
        guestName,
        roomTypes,
        preferences,
      });
      setData(result);
      toast.success("Room assignment suggestion generated");
    } catch {
      toast.error("Failed to generate suggestion");
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-2"
      >
        <ArrowRightLeft className="h-4 w-4" />
        AI Room Assignment
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-[#8B6748]" />
              AI Room Assignment Suggestions
              <Badge variant="outline" className="text-[10px]">Beta</Badge>
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="guest-name" className="text-xs">Guest Name</Label>
              <Input
                id="guest-name"
                placeholder="Enter guest name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferences" className="text-xs">Preferences</Label>
              <Textarea
                id="preferences"
                placeholder="e.g. Quiet room, high floor, near elevator"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                className="text-sm"
                rows={2}
              />
            </div>

            <Button
              onClick={handleSuggest}
              disabled={mutation.isPending || !guestName.trim()}
              size="sm"
              className="w-full"
            >
              {mutation.isPending ? (
                <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
              ) : (
                <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />
              )}
              {mutation.isPending ? "Analyzing..." : "Get Suggestion"}
            </Button>

            {data && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {/* Suggested Room */}
                {data.suggestedRoom && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-primary">Recommended</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">Room {data.suggestedRoom.roomNumber}</span>
                      <Badge variant="secondary" className="text-xs">{data.suggestedRoom.roomType}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{data.suggestedRoom.reason}</p>
                    <p className="text-xs font-medium mt-1">${data.suggestedRoom.rate}/night</p>
                  </div>
                )}

                {/* Alternatives */}
                {data.alternatives.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2">Alternatives</p>
                    <div className="space-y-2">
                      {data.alternatives.map((alt, i) => (
                        <div key={i} className="p-2 rounded-lg border border-border/50">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">Room {alt.roomNumber}</span>
                            <span className="text-[10px] text-muted-foreground">{alt.roomType}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{alt.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {data.notes && (
                  <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <p className="text-[10px] text-amber-700 dark:text-amber-400">{data.notes}</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
