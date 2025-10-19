import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { BookOpen, ChevronDown, ChevronRight, Copy, Menu, X, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PDFViewer } from "@/components/PDFViewer";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

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
    id: "ch1",
    chapter_label: "Chapter 1",
    toc_entry_text: "1 HISTORY OF DIVING",
    page_print_number: "1-1",
    page_index: 1,
    level: 0,
    anchor_slug: "ch1",
    expanded: true,
    children: [
      {
        id: "1-1",
        para_label: "1-1",
        toc_entry_text: "1-1 INTRODUCTION",
        page_print_number: "1-1",
        page_index: 1,
        level: 1,
        anchor_slug: "para-1-1",
        expanded: true,
        children: [
          {
            id: "1-1.1",
            para_label: "1-1.1",
            toc_entry_text: "1-1.1 Purpose",
            page_print_number: "1-1",
            page_index: 1,
            level: 2,
            anchor_slug: "para-1-1-1"
          },
          {
            id: "1-1.2",
            para_label: "1-1.2",
            toc_entry_text: "1-1.2 Scope",
            page_print_number: "1-1",
            page_index: 1,
            level: 2,
            anchor_slug: "para-1-1-2"
          },
          {
            id: "1-1.3",
            para_label: "1-1.3",
            toc_entry_text: "1-1.3 Role of the U.S. Navy",
            page_print_number: "1-1",
            page_index: 1,
            level: 2,
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
        level: 1,
        anchor_slug: "para-1-2",
        expanded: true,
        children: [
          {
            id: "1-2.1",
            para_label: "1-2.1",
            toc_entry_text: "1-2.1 Breathing Tubes",
            page_print_number: "1-2",
            page_index: 2,
            level: 2,
            anchor_slug: "para-1-2-1"
          },
          {
            id: "1-2.2",
            para_label: "1-2.2",
            toc_entry_text: "1-2.2 Breathing Bags",
            page_print_number: "1-3",
            page_index: 3,
            level: 2,
            anchor_slug: "para-1-2-2"
          },
          {
            id: "1-2.3",
            para_label: "1-2.3",
            toc_entry_text: "1-2.3 Diving Bells",
            page_print_number: "1-3",
            page_index: 3,
            level: 2,
            anchor_slug: "para-1-2-3"
          },
          {
            id: "1-2.4",
            para_label: "1-2.4",
            toc_entry_text: "1-2.4 Diving Dress Designs",
            page_print_number: "1-3",
            page_index: 3,
            level: 2,
            anchor_slug: "para-1-2-4",
            expanded: false,
            children: [
              {
                id: "1-2.4.1",
                para_label: "1-2.4.1",
                toc_entry_text: "1-2.4.1 Lethbridge's Diving Dress",
                page_print_number: "1-3",
                page_index: 3,
                level: 3,
                anchor_slug: "para-1-2-4-1"
              },
              {
                id: "1-2.4.2",
                para_label: "1-2.4.2",
                toc_entry_text: "1-2.4.2 Deane's Patented Diving Dress",
                page_print_number: "1-4",
                page_index: 4,
                level: 3,
                anchor_slug: "para-1-2-4-2"
              },
              {
                id: "1-2.4.3",
                para_label: "1-2.4.3",
                toc_entry_text: "1-2.4.3 Siebe's Improved Diving Dress",
                page_print_number: "1-4",
                page_index: 4,
                level: 3,
                anchor_slug: "para-1-2-4-3"
              },
              {
                id: "1-2.4.4",
                para_label: "1-2.4.4",
                toc_entry_text: "1-2.4.4 Salvage of the HMS Royal George",
                page_print_number: "1-5",
                page_index: 5,
                level: 3,
                anchor_slug: "para-1-2-4-4"
              }
            ]
          },
          {
            id: "1-2.5",
            para_label: "1-2.5",
            toc_entry_text: "1-2.5 Caissons",
            page_print_number: "1-5",
            page_index: 5,
            level: 2,
            anchor_slug: "para-1-2-5"
          },
          {
            id: "1-2.6",
            para_label: "1-2.6",
            toc_entry_text: "1-2.6 Physiological Discoveries",
            page_print_number: "1-6",
            page_index: 6,
            level: 2,
            anchor_slug: "para-1-2-6",
            expanded: false,
            children: [
              {
                id: "1-2.6.1",
                para_label: "1-2.6.1",
                toc_entry_text: "1-2.6.1 Caisson Disease (Decompression Sickness)",
                page_print_number: "1-6",
                page_index: 6,
                level: 3,
                anchor_slug: "para-1-2-6-1"
              },
              {
                id: "1-2.6.2",
                para_label: "1-2.6.2",
                toc_entry_text: "1-2.6.2 Inadequate Ventilation",
                page_print_number: "1-7",
                page_index: 7,
                level: 3,
                anchor_slug: "para-1-2-6-2"
              },
              {
                id: "1-2.6.3",
                para_label: "1-2.6.3",
                toc_entry_text: "1-2.6.3 Nitrogen Narcosis",
                page_print_number: "1-7",
                page_index: 7,
                level: 3,
                anchor_slug: "para-1-2-6-3"
              }
            ]
          },
          {
            id: "1-2.7",
            para_label: "1-2.7",
            toc_entry_text: "1-2.7 Armored Diving Suits",
            page_print_number: "1-7",
            page_index: 7,
            level: 2,
            anchor_slug: "para-1-2-7"
          },
          {
            id: "1-2.8",
            para_label: "1-2.8",
            toc_entry_text: "1-2.8 MK V Deep-Sea Diving Dress",
            page_print_number: "1-8",
            page_index: 8,
            level: 2,
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
        level: 1,
        anchor_slug: "para-1-3",
        expanded: false,
        children: [
          {
            id: "1-3.1",
            para_label: "1-3.1",
            toc_entry_text: "1-3.1 Open-Circuit SCUBA",
            page_print_number: "1-9",
            page_index: 9,
            level: 2,
            anchor_slug: "para-1-3-1",
            expanded: false,
            children: [
              {
                id: "1-3.1.1",
                para_label: "1-3.1.1",
                toc_entry_text: "1-3.1.1 Rouquayrol's Demand Regulator",
                page_print_number: "1-9",
                page_index: 9,
                level: 3,
                anchor_slug: "para-1-3-1-1"
              },
              {
                id: "1-3.1.2",
                para_label: "1-3.1.2",
                toc_entry_text: "1-3.1.2 LePrieur's Open-Circuit SCUBA Design",
                page_print_number: "1-9",
                page_index: 9,
                level: 3,
                anchor_slug: "para-1-3-1-2"
              },
              {
                id: "1-3.1.3",
                para_label: "1-3.1.3",
                toc_entry_text: "1-3.1.3 Cousteau and Gagnan's Aqua-Lung",
                page_print_number: "1-10",
                page_index: 10,
                level: 3,
                anchor_slug: "para-1-3-1-3"
              },
              {
                id: "1-3.1.4",
                para_label: "1-3.1.4",
                toc_entry_text: "1-3.1.4 Impact of SCUBA on Diving",
                page_print_number: "1-10",
                page_index: 10,
                level: 3,
                anchor_slug: "para-1-3-1-4"
              }
            ]
          },
          {
            id: "1-3.2",
            para_label: "1-3.2",
            toc_entry_text: "1-3.2 Closed-Circuit SCUBA",
            page_print_number: "1-10",
            page_index: 10,
            level: 2,
            anchor_slug: "para-1-3-2",
            expanded: false,
            children: [
              {
                id: "1-3.2.1",
                para_label: "1-3.2.1",
                toc_entry_text: "1-3.2.1 Fleuss' Closed-Circuit SCUBA",
                page_print_number: "1-10",
                page_index: 10,
                level: 3,
                anchor_slug: "para-1-3-2-1"
              },
              {
                id: "1-3.2.2",
                para_label: "1-3.2.2",
                toc_entry_text: "1-3.2.2 Modern Closed-Circuit Systems",
                page_print_number: "1-11",
                page_index: 11,
                level: 3,
                anchor_slug: "para-1-3-2-2"
              }
            ]
          },
          {
            id: "1-3.3",
            para_label: "1-3.3",
            toc_entry_text: "1-3.3 Hazards of Using Oxygen in SCUBA",
            page_print_number: "1-11",
            page_index: 11,
            level: 2,
            anchor_slug: "para-1-3-3"
          }
        ]
      }
    ]
  },
  {
    id: "ch2",
    chapter_label: "Chapter 2",
    toc_entry_text: "2 UNDERWATER PHYSICS",
    page_print_number: "2-1",
    page_index: 50,
    level: 0,
    anchor_slug: "ch2",
    expanded: false,
    children: [
      {
        id: "2-1",
        para_label: "2-1",
        toc_entry_text: "2-1 INTRODUCTION",
        page_print_number: "2-1",
        page_index: 50,
        level: 1,
        anchor_slug: "para-2-1",
        children: [
          {
            id: "2-1.1",
            para_label: "2-1.1",
            toc_entry_text: "2-1.1 Purpose",
            page_print_number: "2-1",
            page_index: 50,
            level: 2,
            anchor_slug: "para-2-1-1"
          },
          {
            id: "2-1.2",
            para_label: "2-1.2",
            toc_entry_text: "2-1.2 Scope",
            page_print_number: "2-1",
            page_index: 50,
            level: 2,
            anchor_slug: "para-2-1-2"
          }
        ]
      }
    ]
  },
  {
    id: "ch3",
    chapter_label: "Chapter 3",
    toc_entry_text: "3 UNDERWATER PHYSIOLOGY AND DIVING DISORDERS",
    page_print_number: "3-1",
    page_index: 100,
    level: 0,
    anchor_slug: "ch3",
    expanded: false
  }
];

// Content data structure matching the TOC
const documentContent: Record<string, any> = {
  "1": {
    volume_label: "Volume 1",
    chapter_label: "Chapter 1: History of Diving",
    para_label: "1",
    page_print_number: "1-1",
    page_range: "1-1 to 1-12",
    anchor_slug: "ch1",
    warning_flags: ["NOTE"],
    content: `
# 1 HISTORY OF DIVING

This chapter provides an overview of the historical development of diving technology and techniques that led to modern naval diving operations.

## NOTE
This historical overview is essential for understanding the evolution of diving safety practices and technological advances.

The history of diving spans thousands of years, from ancient breath-hold diving to modern sophisticated diving systems used by the U.S. Navy today.
    `
  },
  "1-1": {
    volume_label: "Volume 1",
    chapter_label: "Chapter 1: History of Diving",
    para_label: "1-1",
    page_print_number: "1-1",
    page_range: "1-1 to 1-1",
    anchor_slug: "para-1-1",
    warning_flags: [],
    content: `
# 1-1 INTRODUCTION

This section introduces the purpose, scope, and role of the U.S. Navy in diving operations.

## 1-1.1 Purpose

The purpose of this manual is to provide comprehensive guidance for Navy diving operations, ensuring safety and operational effectiveness.

## 1-1.2 Scope

This manual covers all aspects of Navy diving operations, from basic principles to advanced techniques.

## 1-1.3 Role of the U.S. Navy

The U.S. Navy has been at the forefront of diving technology development and operational implementation since the early 1900s.
    `
  },
  "1-1-1": {
    volume_label: "Volume 1",
    chapter_label: "Chapter 1: History of Diving",
    para_label: "1-1.1",
    page_print_number: "1-1",
    page_range: "1-1",
    anchor_slug: "para-1-1-1",
    warning_flags: [],
    content: `
# 1-1.1 Purpose

The purpose of this manual is to provide comprehensive guidance for all Navy diving operations. This includes:

- Standardized procedures for diving operations
- Safety protocols and emergency procedures
- Equipment operation and maintenance
- Training requirements and certification standards

This manual serves as the authoritative source for Navy diving practices and must be followed by all diving personnel.
    `
  },
  "1-1-2": {
    volume_label: "Volume 1",
    chapter_label: "Chapter 1: History of Diving",
    para_label: "1-1.2",
    page_print_number: "1-1",
    page_range: "1-1",
    anchor_slug: "para-1-1-2",
    warning_flags: [],
    content: `
# 1-1.2 Scope

This manual encompasses all types of Navy diving operations including:

- Surface-supplied air diving
- SCUBA diving operations
- Mixed gas diving
- Saturation diving systems
- Diving bell operations
- Emergency diving procedures

The manual applies to all Navy diving personnel, regardless of rating or specialization.
    `
  },
  "1-1-3": {
    volume_label: "Volume 1",
    chapter_label: "Chapter 1: History of Diving",
    para_label: "1-1.3",
    page_print_number: "1-1",
    page_range: "1-1",
    anchor_slug: "para-1-1-3",
    warning_flags: [],
    content: `
# 1-1.3 Role of the U.S. Navy

The U.S. Navy has played a pivotal role in the development of diving technology and procedures:

- **Pioneering Research**: Navy laboratories have developed many diving technologies
- **Safety Standards**: Established comprehensive safety protocols
- **Training Programs**: Created systematic diver training and certification
- **Operational Excellence**: Demonstrated diving capabilities in military and civilian applications

The Navy continues to lead in diving technology advancement and operational safety.
    `
  },
  "1-2": {
    volume_label: "Volume 1",
    chapter_label: "Chapter 1: History of Diving",
    para_label: "1-2",
    page_print_number: "1-1",
    page_range: "1-1 to 1-8",
    anchor_slug: "para-1-2",
    warning_flags: ["WARNING", "CAUTION"],
    content: `
# 1-2 SURFACE-SUPPLIED AIR DIVING

Surface-supplied air diving represents the foundation of modern Navy diving operations.

## WARNING
Surface-supplied diving operations require constant communication and monitoring between diver and surface personnel. Loss of air supply can be fatal.

## CAUTION
All surface-supplied diving equipment must be inspected and tested before each dive operation.

This section covers the historical development and current practices of surface-supplied air diving systems.

## 1-2.1 Breathing Tubes

Early diving attempts used simple breathing tubes, which were limited by:
- Depth restrictions due to breathing resistance
- Water intrusion problems
- Limited mobility

## 1-2.2 Breathing Bags

Breathing bags represented an improvement over simple tubes:
- Provided air reservoir
- Allowed limited underwater mobility
- Still had depth and duration limitations

## 1-2.3 Diving Bells

Diving bells were a significant advancement:
- Enclosed air space for breathing
- Protection from water pressure
- Platform for extended underwater work
    `
  },
  "1-2-4": {
    volume_label: "Volume 1",
    chapter_label: "Chapter 1: History of Diving",
    para_label: "1-2.4",
    page_print_number: "1-3",
    page_range: "1-3 to 1-5",
    anchor_slug: "para-1-2-4",
    warning_flags: [],
    content: `
# 1-2.4 Diving Dress Designs

The evolution of diving dress designs marked a crucial period in diving history.

## 1-2.4.1 Lethbridge's Diving Dress

John Lethbridge's diving apparatus (1715) featured:
- Leather-covered wooden barrel
- Glass viewing ports
- Air supplied from surface
- Limited but effective for salvage work

## 1-2.4.2 Deane's Patented Diving Dress

The Deane brothers' helmet design included:
- Metal helmet with air supply
- Improved visibility
- Better air circulation
- Foundation for modern helmet design

## 1-2.4.3 Siebe's Improved Diving Dress

Augustus Siebe's improvements:
- Sealed diving suit
- Reliable air valve system
- Enhanced safety features
- Became standard for decades

## 1-2.4.4 Salvage of the Royal George

The Royal George salvage operation demonstrated:
- Practical application of diving technology
- Large-scale underwater operations
- Economic viability of diving services
- Public recognition of diving capabilities
    `
  },
  "9-3": {
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

## 9-3.1 Table Selection

The standard air decompression tables provide the basis for all air diving operations. These tables specify the required decompression stops based on:

- Maximum depth reached during the dive
- Bottom time (time from leaving surface to beginning ascent)
- Repetitive dive considerations

## CAUTION
Bottom time begins when the diver leaves the surface and ends when the diver begins ascent from maximum depth. This includes descent time.

## 9-3.2 Decompression Stop Requirements

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

## 9-3.3 Emergency Decompression

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
  }
};

export default function DocumentViewer() {
  const isMobile = useIsMobile();
  const [selectedTOC, setSelectedTOC] = useState<string>("1-1");
  const [tocData, setTocData] = useState<TOCItem[]>(mockTOC);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [targetPage, setTargetPage] = useState<number | undefined>();
  const [targetParagraph, setTargetParagraph] = useState<string | undefined>();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [checkingPdf, setCheckingPdf] = useState<boolean>(true);
  
  // TOC visibility state with localStorage persistence
  const [isTOCOpen, setIsTOCOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('toc-open');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const tocRef = useRef<HTMLDivElement>(null);

  // Resolve the Navy Diving Manual PDF URL (Storage first, fallback to public file)
  useEffect(() => {
    let cancelled = false;
    const resolvePdf = async () => {
      try {
        // Try Storage bucket "manuals"
        const { data: files, error } = await supabase.storage
          .from('manuals')
          .list('', { limit: 100, search: 'navy-diving-manual.pdf' });

        let url: string | null = null;
        if (!error && files && files.length > 0) {
          const match = files.find(f => f.name.toLowerCase().endsWith('.pdf')) || files[0];
          const pub = supabase.storage.from('manuals').getPublicUrl(match.name);
          url = pub.data.publicUrl;
        } else {
          // Fallback to public file if present
          url = '/navy-diving-manual.pdf';
        }

        // Validate that the URL returns a PDF
        const res = await fetch(url, { method: 'GET' });
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || !ct.includes('pdf')) {
          if (!cancelled) setPdfUrl(null);
        } else {
          if (!cancelled) setPdfUrl(url);
        }
      } catch (e) {
        if (!cancelled) setPdfUrl(null);
      } finally {
        if (!cancelled) setCheckingPdf(false);
      }
    };

    resolvePdf();
    return () => { cancelled = true; };
  }, []);

  // Parse hash parameters for deep linking
  useEffect(() => {
    const hash = location.hash.slice(1); // Remove #
    if (hash) {
      const params = new URLSearchParams(hash);
      const pageParam = params.get('p');
      const paraParam = params.get('para');
      
      if (pageParam) {
        const page = parseInt(pageParam);
        setTargetPage(page);
      }
      
      if (paraParam) {
        setTargetParagraph(paraParam);
      }
    }
  }, [location.hash]);

  // Get current content based on selected TOC item
  const currentContent = documentContent[selectedTOC] || documentContent["1-1"];

  // Persist TOC state to localStorage
  useEffect(() => {
    localStorage.setItem('toc-open', JSON.stringify(isTOCOpen));
  }, [isTOCOpen]);

  // Close drawer with Esc key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTOCOpen && isMobile) {
        setIsTOCOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isTOCOpen, isMobile]);

  const toggleTOC = () => {
    setIsTOCOpen(!isTOCOpen);
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
    // Create deep link with page and paragraph
    const url = `${window.location.origin}${window.location.pathname}#p=${currentPage}&para=${currentContent.anchor_slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Deep link to this section has been copied to clipboard",
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleTOCClick = (item: TOCItem) => {
    console.log('TOC item clicked:', {
      id: item.id,
      text: item.toc_entry_text,
      page: item.page_index,
      para: item.para_label
    });
    
    setSelectedTOC(item.id);
    setTargetPage(item.page_index);
    if (item.para_label) {
      setTargetParagraph(item.para_label);
    }
    
    // Update URL hash
    const hash = item.para_label 
      ? `p=${item.page_index}&para=${item.para_label}`
      : `p=${item.page_index}`;
    navigate(`#${hash}`, { replace: true });
    
    console.log('Navigation updated to:', hash);
    
    // Close drawer on mobile after selection
    if (isMobile) {
      setIsTOCOpen(false);
      console.log('Mobile drawer closed');
    }
  };

  const getIndentClass = (level: number) => {
    const indents: Record<number, string> = {
      0: '',
      1: 'ml-4',
      2: 'ml-8', 
      3: 'ml-12',
      4: 'ml-16'
    };
    return indents[level] || 'ml-16';
  };

  const renderTOCItem = (item: TOCItem): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0;
    const isSelected = selectedTOC === item.id;
    
    return (
      <div key={item.id} className="mb-1">
        <div className={`flex items-center gap-1 ${getIndentClass(item.level)}`}>
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
            onClick={() => handleTOCClick(item)}
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

  // TOC Content Component (reusable for both sidebar and drawer)
  const TOCContent = () => (
    <div className="flex flex-col h-full">
      <div className="pb-4 px-4 pt-4 border-b">
        <div className="flex items-center gap-2 text-[hsl(var(--navy-primary))]">
          <BookOpen className="w-5 h-5" />
          <h2 className="font-semibold">Table of Contents</h2>
        </div>
      </div>
      <ScrollArea className="flex-1 px-4 pb-4 pt-4">
        {tocData.map(renderTOCItem)}
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Document Content - Full width */}
      <Card className="flex-1 flex flex-col">
        {/* Top Bar with TOC Toggle, Current Location and Copy Link */}
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            {/* TOC Toggle Button - Always visible */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTOC}
              aria-controls="toc-panel"
              aria-expanded={isTOCOpen}
              aria-label="Toggle Table of Contents"
              className="shrink-0"
            >
              {isTOCOpen && !isMobile ? <X className="w-4 h-4 mr-2" /> : <Menu className="w-4 h-4 mr-2" />}
              TOC
            </Button>

            <div className="flex-1 min-w-0">
              <CardTitle className="text-[hsl(var(--navy-primary))] text-base lg:text-lg truncate">
                {currentContent.chapter_label}
              </CardTitle>
              <div className="flex items-center gap-2 lg:gap-4 mt-2 flex-wrap">
                <Badge variant="outline" className="status-note text-xs">
                  {currentContent.volume_label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {currentContent.para_label}
                </Badge>
                <Badge variant="outline" className="hidden sm:inline-flex text-xs">
                  Pages {currentContent.page_range}
                </Badge>
                {currentContent.warning_flags?.map((flag: string) => (
                  <Badge 
                    key={flag} 
                    variant="outline" 
                    className={`text-xs ${
                      flag === 'WARNING' ? 'border-[hsl(var(--warning-amber))] text-[hsl(var(--warning-amber))]' :
                      flag === 'CAUTION' ? 'border-[hsl(var(--caution-orange))] text-[hsl(var(--caution-orange))]' :
                      'border-[hsl(var(--note-blue))] text-[hsl(var(--note-blue))]'
                    }`}
                  >
                    {flag}
                  </Badge>
                ))}
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={handleCopyLink} className="shrink-0">
              <Copy className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Copy Link</span>
            </Button>
          </div>
        </CardHeader>

        {/* Content Area with TOC Sidebar or Drawer */}
        <CardContent className="flex-1 p-0 overflow-hidden flex">
          {/* Desktop: Collapsible Sidebar */}
          {!isMobile && isTOCOpen && (
            <div 
              id="toc-panel"
              ref={tocRef}
              className="w-80 lg:w-96 border-r bg-card flex flex-col animate-slide-in-left"
              role="navigation"
              aria-label="Table of Contents"
            >
              <TOCContent />
            </div>
          )}

          {/* PDF Viewer Area - Expands when TOC is closed */}
          <div className="flex-1 overflow-hidden">
            {checkingPdf ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Checking for manual PDF...
              </div>
            ) : pdfUrl ? (
              <PDFViewer 
                pdfUrl={pdfUrl}
                targetPage={targetPage}
                targetParagraph={targetParagraph}
                onPageChange={handlePageChange}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-6">
                <div className="text-lg font-medium">Manual PDF not found</div>
                <div className="text-sm text-muted-foreground max-w-xl">
                  We couldn't locate the Navy Diving Manual. Upload <strong>navy-diving-manual.pdf</strong> to the Storage bucket <strong>manuals</strong> or place it at <code>/public/navy-diving-manual.pdf</code>.
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mobile: Drawer Overlay */}
      {isMobile && (
        <Drawer open={isTOCOpen} onOpenChange={setIsTOCOpen}>
          <DrawerContent 
            id="toc-panel"
            className="h-[85vh]"
            aria-label="Table of Contents"
          >
            <DrawerHeader className="border-b">
              <div className="flex items-center justify-between">
                <DrawerTitle className="flex items-center gap-2 text-[hsl(var(--navy-primary))]">
                  <BookOpen className="w-5 h-5" />
                  Table of Contents
                </DrawerTitle>
                <DrawerClose asChild>
                  <Button variant="ghost" size="sm" aria-label="Close Table of Contents">
                    <X className="w-4 h-4" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full px-4 pb-4 pt-4">
                {tocData.map(renderTOCItem)}
              </ScrollArea>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}