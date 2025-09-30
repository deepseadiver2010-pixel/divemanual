import { useState, createContext, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, ChevronDown, ChevronRight, ExternalLink, AlertTriangle, Info, AlertCircle, Copy, Menu, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Context for managing main nav visibility
const MainNavContext = createContext<{
  isMainNavHidden: boolean;
  toggleMainNav: () => void;
}>({
  isMainNavHidden: false,
  toggleMainNav: () => {}
});

interface TOCItem {
  id: string;
  volume_label?: string;
  chapter_label?: string;
  para_label?: string;
  toc_entry_text: string;
  page_print_number: string;
  page_index: number;
  level: number;
  anchor_slug: string;
  children?: TOCItem[];
  expanded?: boolean;
}

const mockTOC: TOCItem[] = [
  {
    id: "vol1",
    volume_label: "Volume 1",
    toc_entry_text: "Volume 1: History of Diving",
    page_print_number: "1-1",
    page_index: 1,
    level: 0,
    anchor_slug: "volume-1",
    expanded: true,
    children: [
      {
        id: "ch1",
        chapter_label: "Chapter 1",
        toc_entry_text: "1 HISTORY OF DIVING",
        page_print_number: "1-1",
        page_index: 1,
        level: 1,
        anchor_slug: "ch1",
        expanded: true,
        children: [
          {
            id: "1-1",
            para_label: "1-1",
            toc_entry_text: "1-1 INTRODUCTION",
            page_print_number: "1-1",
            page_index: 1,
            level: 2,
            anchor_slug: "para-1-1",
            expanded: true,
            children: [
              {
                id: "1-1-1",
                para_label: "1-1.1",
                toc_entry_text: "1-1.1 Purpose",
                page_print_number: "1-1",
                page_index: 1,
                level: 3,
                anchor_slug: "para-1-1-1"
              },
              {
                id: "1-1-2",
                para_label: "1-1.2",
                toc_entry_text: "1-1.2 Scope",
                page_print_number: "1-1",
                page_index: 1,
                level: 3,
                anchor_slug: "para-1-1-2"
              },
              {
                id: "1-1-3",
                para_label: "1-1.3",
                toc_entry_text: "1-1.3 Role of the U.S. Navy",
                page_print_number: "1-1",
                page_index: 1,
                level: 3,
                anchor_slug: "para-1-1-3"
              }
            ]
          },
          {
            id: "1-2",
            para_label: "1-2",
            toc_entry_text: "1-2 SURFACE-SUPPLIED AIR DIVING",
            page_print_number: "1-1",
            page_index: 1,
            level: 2,
            anchor_slug: "para-1-2",
            expanded: true,
            children: [
              {
                id: "1-2-1",
                para_label: "1-2.1",
                toc_entry_text: "1-2.1 Breathing Tubes",
                page_print_number: "1-2",
                page_index: 2,
                level: 3,
                anchor_slug: "para-1-2-1"
              },
              {
                id: "1-2-2",
                para_label: "1-2.2",
                toc_entry_text: "1-2.2 Breathing Bags",
                page_print_number: "1-3",
                page_index: 3,
                level: 3,
                anchor_slug: "para-1-2-2"
              },
              {
                id: "1-2-3",
                para_label: "1-2.3",
                toc_entry_text: "1-2.3 Diving Bells",
                page_print_number: "1-3",
                page_index: 3,
                level: 3,
                anchor_slug: "para-1-2-3"
              },
              {
                id: "1-2-4",
                para_label: "1-2.4",
                toc_entry_text: "1-2.4 Diving Dress Designs",
                page_print_number: "1-3",
                page_index: 3,
                level: 3,
                anchor_slug: "para-1-2-4",
                expanded: false,
                children: [
                  {
                    id: "1-2-4-1",
                    para_label: "1-2.4.1",
                    toc_entry_text: "1-2.4.1 Lethbridge's Diving Dress",
                    page_print_number: "1-3",
                    page_index: 3,
                    level: 4,
                    anchor_slug: "para-1-2-4-1"
                  },
                  {
                    id: "1-2-4-2",
                    para_label: "1-2.4.2",
                    toc_entry_text: "1-2.4.2 Deane's Patented Diving Dress",
                    page_print_number: "1-4",
                    page_index: 4,
                    level: 4,
                    anchor_slug: "para-1-2-4-2"
                  },
                  {
                    id: "1-2-4-3",
                    para_label: "1-2.4.3",
                    toc_entry_text: "1-2.4.3 Siebe's Improved Diving Dress",
                    page_print_number: "1-4",
                    page_index: 4,
                    level: 4,
                    anchor_slug: "para-1-2-4-3"
                  },
                  {
                    id: "1-2-4-4",
                    para_label: "1-2.4.4",
                    toc_entry_text: "1-2.4.4 Salvage of the Royal George",
                    page_print_number: "1-5",
                    page_index: 5,
                    level: 4,
                    anchor_slug: "para-1-2-4-4"
                  }
                ]
              },
              {
                id: "1-2-5",
                para_label: "1-2.5",
                toc_entry_text: "1-2.5 Caissons",
                page_print_number: "1-5",
                page_index: 5,
                level: 3,
                anchor_slug: "para-1-2-5"
              },
              {
                id: "1-2-6",
                para_label: "1-2.6",
                toc_entry_text: "1-2.6 Physiological Discoveries",
                page_print_number: "1-6",
                page_index: 6,
                level: 3,
                anchor_slug: "para-1-2-6",
                expanded: false,
                children: [
                  {
                    id: "1-2-6-1",
                    para_label: "1-2.6.1",
                    toc_entry_text: "1-2.6.1 Caisson Disease (Decompression Sickness)",
                    page_print_number: "1-6",
                    page_index: 6,
                    level: 4,
                    anchor_slug: "para-1-2-6-1"
                  },
                  {
                    id: "1-2-6-2",
                    para_label: "1-2.6.2",
                    toc_entry_text: "1-2.6.2 Inadequate Ventilation",
                    page_print_number: "1-7",
                    page_index: 7,
                    level: 4,
                    anchor_slug: "para-1-2-6-2"
                  },
                  {
                    id: "1-2-6-3",
                    para_label: "1-2.6.3",
                    toc_entry_text: "1-2.6.3 Nitrogen Narcosis",
                    page_print_number: "1-7",
                    page_index: 7,
                    level: 4,
                    anchor_slug: "para-1-2-6-3"
                  }
                ]
              },
              {
                id: "1-2-7",
                para_label: "1-2.7",
                toc_entry_text: "1-2.7 Armored Diving Suits",
                page_print_number: "1-7",
                page_index: 7,
                level: 3,
                anchor_slug: "para-1-2-7"
              },
              {
                id: "1-2-8",
                para_label: "1-2.8",
                toc_entry_text: "1-2.8 MK V Deep-Sea Diving Dress",
                page_print_number: "1-8",
                page_index: 8,
                level: 3,
                anchor_slug: "para-1-2-8"
              }
            ]
          },
          {
            id: "1-3",
            para_label: "1-3",
            toc_entry_text: "1-3 SCUBA DIVING",
            page_print_number: "1-8",
            page_index: 8,
            level: 2,
            anchor_slug: "para-1-3",
            expanded: false,
            children: [
              {
                id: "1-3-1",
                para_label: "1-3.1",
                toc_entry_text: "1-3.1 Open-Circuit SCUBA",
                page_print_number: "1-9",
                page_index: 9,
                level: 3,
                anchor_slug: "para-1-3-1",
                expanded: false,
                children: [
                  {
                    id: "1-3-1-1",
                    para_label: "1-3.1.1",
                    toc_entry_text: "1-3.1.1 Rouquayrol's Demand Regulator",
                    page_print_number: "1-9",
                    page_index: 9,
                    level: 4,
                    anchor_slug: "para-1-3-1-1"
                  },
                  {
                    id: "1-3-1-2",
                    para_label: "1-3.1.2",
                    toc_entry_text: "1-3.1.2 LePrieur's Open-Circuit SCUBA Design",
                    page_print_number: "1-9",
                    page_index: 9,
                    level: 4,
                    anchor_slug: "para-1-3-1-2"
                  },
                  {
                    id: "1-3-1-3",
                    para_label: "1-3.1.3",
                    toc_entry_text: "1-3.1.3 Cousteau and Gagnan Aqua-Lung",
                    page_print_number: "1-10",
                    page_index: 10,
                    level: 4,
                    anchor_slug: "para-1-3-1-3"
                  },
                  {
                    id: "1-3-1-4",
                    para_label: "1-3.1.4",
                    toc_entry_text: "1-3.1.4 Impact of SCUBA on Diving",
                    page_print_number: "1-10",
                    page_index: 10,
                    level: 4,
                    anchor_slug: "para-1-3-1-4"
                  }
                ]
              },
              {
                id: "1-3-2",
                para_label: "1-3.2",
                toc_entry_text: "1-3.2 Closed-Circuit SCUBA",
                page_print_number: "1-10",
                page_index: 10,
                level: 3,
                anchor_slug: "para-1-3-2"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "vol2",
    volume_label: "Volume 2", 
    toc_entry_text: "Volume 2: Decompression and Mixed Gas Diving",
    page_print_number: "2-1",
    page_index: 200,
    level: 0,
    anchor_slug: "volume-2",
    expanded: true,
    children: [
      { 
        id: "ch9", 
        chapter_label: "Chapter 9: Decompression Procedures",
        toc_entry_text: "Chapter 9: Decompression Procedures", 
        page_print_number: "9-1", 
        page_index: 201, 
        level: 1,
        anchor_slug: "ch9",
        expanded: true,
        children: [
          { 
            id: "9-3", 
            para_label: "9-3",
            toc_entry_text: "9-3 Standard Air Decompression Tables", 
            page_print_number: "9-15", 
            page_index: 215, 
            level: 2,
            anchor_slug: "para-9-3" 
          },
          { 
            id: "9-3-1", 
            para_label: "9-3-1",
            toc_entry_text: "9-3-1 Table Selection", 
            page_print_number: "9-16", 
            page_index: 216, 
            level: 3,
            anchor_slug: "para-9-3-1" 
          },
          { 
            id: "9-3-2", 
            para_label: "9-3-2",
            toc_entry_text: "9-3-2 Decompression Stop Requirements", 
            page_print_number: "9-18", 
            page_index: 218, 
            level: 3,
            anchor_slug: "para-9-3-2" 
          }
        ]
      }
    ]
  }
];

const mockContent = {
  volume_label: "Volume 2",
  chapter_label: "Chapter 9: Decompression Procedures",
  para_label: "9-3",
  page_print_number: "9-15",
  page_range: "9-15 to 9-20",
  anchor_slug: "para-9-3",
  warning_flags: ["WARNING", "CAUTION", "NOTE"],
  content: `
# 9-3 Standard Air Decompression Tables

## WARNING
Failure to follow decompression procedures can result in decompression sickness, which may cause permanent injury or death. All divers must strictly adhere to established decompression protocols.

## 9-3-1 Table Selection

The standard air decompression tables provide the basis for all air diving operations. These tables specify the required decompression stops based on:

- Maximum depth reached during the dive
- Bottom time (time from leaving surface to beginning ascent)
- Repetitive dive considerations

## CAUTION
Bottom time begins when the diver leaves the surface and ends when the diver begins ascent from maximum depth. This includes descent time.

## 9-3-2 Decompression Stop Requirements

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

## 9-3-3 Emergency Decompression

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
  const [selectedTOC, setSelectedTOC] = useState<string>("9-3");
  const [tocData, setTocData] = useState<TOCItem[]>(mockTOC);
  const [isMainNavHidden, setIsMainNavHidden] = useState(false);
  const { toast } = useToast();

  const toggleMainNav = () => {
    setIsMainNavHidden(!isMainNavHidden);
  };

  const toggleTOCExpansion = (itemId: string) => {
    const updateTOC = (items: TOCItem[]): TOCItem[] => {
      return items.map(item => {
        if (item.id === itemId) {
          return { ...item, expanded: !item.expanded };
        }
        if (item.children) {
          return { ...item, children: updateTOC(item.children) };
        }
        return item;
      });
    };
    setTocData(updateTOC(tocData));
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#${mockContent.anchor_slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Deep link to this section has been copied to clipboard",
    });
  };

  const renderTOCItem = (item: TOCItem): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0;
    const isSelected = selectedTOC === item.id;
    
    return (
      <div key={item.id} className="mb-1">
        <div className={`flex items-center gap-1 ${item.level > 0 ? `ml-${item.level * 4}` : ''}`}>
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-6 w-6"
              onClick={() => toggleTOCExpansion(item.id)}
            >
              {item.expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </Button>
          )}
          <Button
            variant={isSelected ? "secondary" : "ghost"}
            className="flex-1 justify-between text-left h-auto py-1.5 px-2 min-h-0"
            onClick={() => setSelectedTOC(item.id)}
          >
            <div className="flex justify-between items-center w-full">
              <span className={`text-sm ${item.level === 0 ? 'font-semibold' : ''} ${!hasChildren ? 'ml-7' : ''}`}>
                {item.toc_entry_text}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                {item.page_print_number}
              </span>
            </div>
          </Button>
        </div>
        {hasChildren && item.expanded && (
          <div className="mt-1">
            {item.children?.map(renderTOCItem)}
          </div>
        )}
      </div>
    );
  };

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
      {/* Table of Contents - Automatically expands when main nav is hidden */}
      <Card className="w-80 lg:w-96 flex flex-col transition-all duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-[hsl(var(--navy-primary))]">
            <BookOpen className="w-5 h-5" />
            Navy Diving Manual - Table of Contents
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full px-4 pb-4">
            {tocData.map(renderTOCItem)}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Document Content - Expanded to fill remaining space */}
      <Card className="flex-1 flex flex-col">
        {/* Top Bar with Current Location and Copy Link */}
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-[hsl(var(--navy-primary))] text-lg">
                {mockContent.chapter_label}
              </CardTitle>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                <Badge variant="outline" className="status-note">
                  {mockContent.volume_label}
                </Badge>
                <Badge variant="outline">
                  {mockContent.para_label}
                </Badge>
                <Badge variant="outline">
                  Pages {mockContent.page_range}
                </Badge>
                {mockContent.warning_flags?.map((flag) => (
                  <Badge 
                    key={flag} 
                    variant="outline" 
                    className={
                      flag === 'WARNING' ? 'border-[hsl(var(--warning-amber))] text-[hsl(var(--warning-amber))]' :
                      flag === 'CAUTION' ? 'border-[hsl(var(--caution-orange))] text-[hsl(var(--caution-orange))]' :
                      'border-[hsl(var(--note-blue))] text-[hsl(var(--note-blue))]'
                    }
                  >
                    {flag}
                  </Badge>
                ))}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
          </div>
        </CardHeader>

        {/* Document Content Area */}
        <CardContent className="flex-1 p-6">
          <ScrollArea className="h-full">
            <div id={mockContent.anchor_slug} className="prose prose-sm max-w-none">
              {renderContent(mockContent.content)}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}