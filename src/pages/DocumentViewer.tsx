import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { BookOpen, ChevronRight, ExternalLink, AlertTriangle, Info, AlertCircle } from "lucide-react";

interface TOCItem {
  id: string;
  title: string;
  page: number;
  level: number;
  children?: TOCItem[];
}

const mockTOC: TOCItem[] = [
  {
    id: "vol1",
    title: "Volume 1: Diving Principles and Operations",
    page: 1,
    level: 0,
    children: [
      { id: "ch1", title: "Chapter 1: Introduction to Navy Diving", page: 1, level: 1 },
      { id: "ch2", title: "Chapter 2: Diving Physics", page: 25, level: 1 },
      { id: "ch3", title: "Chapter 3: Diving Physiology", page: 48, level: 1 },
    ]
  },
  {
    id: "vol2", 
    title: "Volume 2: Decompression and Mixed Gas Diving",
    page: 200,
    level: 0,
    children: [
      { id: "ch9", title: "Chapter 9: Decompression Procedures", page: 201, level: 1 },
      { id: "ch10", title: "Chapter 10: Mixed Gas Operations", page: 285, level: 1 },
    ]
  }
];

const mockContent = {
  title: "Chapter 9: Decompression Procedures",
  volume: "Volume 2",
  page: "9-15",
  content: `
# 9.3 Standard Air Decompression Tables

## WARNING
Failure to follow decompression procedures can result in decompression sickness, which may cause permanent injury or death. All divers must strictly adhere to established decompression protocols.

## 9.3.1 Table Selection

The standard air decompression tables provide the basis for all air diving operations. These tables specify the required decompression stops based on:

- Maximum depth reached during the dive
- Bottom time (time from leaving surface to beginning ascent)
- Repetitive dive considerations

## CAUTION
Bottom time begins when the diver leaves the surface and ends when the diver begins ascent from maximum depth. This includes descent time.

## 9.3.2 Decompression Stop Requirements

Decompression stops are mandatory when:
1. Diving operations exceed no-decompression limits
2. Emergency ascent procedures require staged decompression
3. Repetitive dive calculations indicate decompression necessity

### Stop Depths and Times

Standard decompression stops are conducted at:
- 20 feet: As specified in tables
- 10 feet: Final decompression stop
- Surface: Complete decompression sequence

## NOTE
All decompression stops are measured from the diver's chest level and must be maintained within ±2 feet of specified depth.

## 9.3.3 Emergency Decompression

In emergency situations where standard decompression cannot be completed:

1. **Immediate Actions:**
   - Assess diver condition
   - Initiate emergency ascent if required
   - Prepare for potential decompression sickness treatment

2. **Treatment Considerations:**
   - Hyperbaric chamber availability
   - Transportation requirements
   - Medical evaluation protocols
  `
};

export default function DocumentViewer() {
  const [selectedTOC, setSelectedTOC] = useState<string>("ch9");
  const [currentPage, setCurrentPage] = useState(215);

  const renderTOCItem = (item: TOCItem) => (
    <div key={item.id} className={`ml-${item.level * 4}`}>
      <Button
        variant={selectedTOC === item.id ? "secondary" : "ghost"}
        className="w-full justify-start text-left h-auto py-2"
        onClick={() => setSelectedTOC(item.id)}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-sm">{item.title}</span>
          <span className="text-xs text-muted-foreground">p. {item.page}</span>
        </div>
      </Button>
      {item.children?.map(renderTOCItem)}
    </div>
  );

  const renderContent = (content: string) => {
    const lines = content.trim().split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold mb-4 text-[hsl(var(--navy-primary))]">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## WARNING')) {
        return (
          <div key={index} className="status-warning border-l-4 p-4 my-4 rounded-r-lg">
            <div className="flex items-center gap-2 font-bold mb-2">
              <AlertTriangle className="w-5 h-5" />
              WARNING
            </div>
          </div>
        );
      }
      if (line.startsWith('## CAUTION')) {
        return (
          <div key={index} className="status-caution border-l-4 p-4 my-4 rounded-r-lg">
            <div className="flex items-center gap-2 font-bold mb-2">
              <AlertCircle className="w-5 h-5" />
              CAUTION
            </div>
          </div>
        );
      }
      if (line.startsWith('## NOTE')) {
        return (
          <div key={index} className="status-note border-l-4 p-4 my-4 rounded-r-lg">
            <div className="flex items-center gap-2 font-bold mb-2">
              <Info className="w-5 h-5" />
              NOTE
            </div>
          </div>
        );
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-semibold mb-3 mt-6 text-[hsl(var(--navy-light))]">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-medium mb-2 mt-4">{line.slice(4)}</h3>;
      }
      if (line.trim() === '') {
        return <br key={index} />;
      }
      if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('- ')) {
        return <li key={index} className="ml-6 mb-1">{line.slice(2).trim()}</li>;
      }
      return <p key={index} className="mb-3 text-sm leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Table of Contents */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-[hsl(var(--navy-primary))]">
            <BookOpen className="w-5 h-5" />
            Table of Contents
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full px-4">
            {mockTOC.map(renderTOCItem)}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Document Content */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[hsl(var(--navy-primary))]">{mockContent.title}</CardTitle>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="outline" className="status-note">
                  {mockContent.volume}
                </Badge>
                <Badge variant="outline">
                  Page {mockContent.page}
                </Badge>
                <Button variant="outline" size="sm" className="ml-auto">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-6">
          <ScrollArea className="h-full">
            <div className="prose prose-sm max-w-none">
              {renderContent(mockContent.content)}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quick Navigation */}
      <Card className="w-64">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm text-[hsl(var(--navy-primary))]">Quick Navigation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Safety Notices</h4>
            <Button variant="ghost" size="sm" className="w-full justify-start h-auto py-2">
              <AlertTriangle className="w-4 h-4 mr-2 text-[hsl(var(--warning-amber))]" />
              <div className="text-left">
                <div className="text-xs font-medium">Warning</div>
                <div className="text-xs text-muted-foreground">Decompression Safety</div>
              </div>
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start h-auto py-2">
              <AlertCircle className="w-4 h-4 mr-2 text-[hsl(var(--caution-orange))]" />
              <div className="text-left">
                <div className="text-xs font-medium">Caution</div>
                <div className="text-xs text-muted-foreground">Bottom Time Calculation</div>
              </div>
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start h-auto py-2">
              <Info className="w-4 h-4 mr-2 text-[hsl(var(--note-blue))]" />
              <div className="text-left">
                <div className="text-xs font-medium">Note</div>
                <div className="text-xs text-muted-foreground">Depth Measurement</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}