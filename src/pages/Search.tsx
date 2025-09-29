import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search as SearchIcon, Filter, BookOpen, ExternalLink, AlertTriangle, Info, AlertCircle } from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  volume: string;
  chapter: string;
  page: string;
  excerpt: string;
  type: 'text' | 'warning' | 'caution' | 'note';
  relevanceScore: number;
}

const mockResults: SearchResult[] = [
  {
    id: '1',
    title: 'Standard Air Decompression Tables',
    volume: 'Volume 2',
    chapter: 'Chapter 9',
    page: '9-15',
    excerpt: 'The standard air decompression tables provide the basis for all air diving operations. These tables specify the required decompression stops based on maximum depth reached during the dive...',
    type: 'text',
    relevanceScore: 0.95
  },
  {
    id: '2',
    title: 'Decompression Safety Warning',
    volume: 'Volume 2', 
    chapter: 'Chapter 9',
    page: '9-15',
    excerpt: 'WARNING: Failure to follow decompression procedures can result in decompression sickness, which may cause permanent injury or death.',
    type: 'warning',
    relevanceScore: 0.92
  },
  {
    id: '3',
    title: 'Emergency Decompression Procedures',
    volume: 'Volume 2',
    chapter: 'Chapter 9', 
    page: '9-23',
    excerpt: 'In emergency situations where standard decompression cannot be completed, divers must follow emergency ascent procedures...',
    type: 'text',
    relevanceScore: 0.88
  },
  {
    id: '4',
    title: 'Bottom Time Calculation',
    volume: 'Volume 2',
    chapter: 'Chapter 9',
    page: '9-18',
    excerpt: 'CAUTION: Bottom time begins when the diver leaves the surface and ends when the diver begins ascent from maximum depth.',
    type: 'caution',
    relevanceScore: 0.85
  }
];

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('decompression');
  const [searchType, setSearchType] = useState('all');
  const [volumeFilter, setVolumeFilter] = useState('all');
  const [safetyFilter, setSafetyFilter] = useState('all');
  const [results, setResults] = useState<SearchResult[]>(mockResults);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning-amber))]" />;
      case 'caution': return <AlertCircle className="w-4 h-4 text-[hsl(var(--caution-orange))]" />;
      case 'note': return <Info className="w-4 h-4 text-[hsl(var(--note-blue))]" />;
      default: return <BookOpen className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning': return 'status-warning';
      case 'caution': return 'status-caution';
      case 'note': return 'status-note';
      default: return 'border-border';
    }
  };

  const handleSearch = () => {
    // Simulate search logic
    console.log('Searching for:', searchQuery);
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[hsl(var(--navy-primary))]">
            <Search className="w-5 h-5" />
            Navy Diving Manual Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search procedures, regulations, safety protocols..."
                className="h-12 text-base"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} size="lg" variant="hero">
              <SearchIcon className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>

          <Tabs defaultValue="full-text" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="full-text">Full-Text Search</TabsTrigger>
              <TabsTrigger value="semantic">Semantic Search</TabsTrigger>
            </TabsList>
            <TabsContent value="full-text" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select value={volumeFilter} onValueChange={setVolumeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Volume" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Volumes</SelectItem>
                    <SelectItem value="volume1">Volume 1</SelectItem>
                    <SelectItem value="volume2">Volume 2</SelectItem>
                    <SelectItem value="volume3">Volume 3</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={safetyFilter} onValueChange={setSafetyFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Safety Notices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Content</SelectItem>
                    <SelectItem value="warning">Warnings Only</SelectItem>
                    <SelectItem value="caution">Cautions Only</SelectItem>
                    <SelectItem value="note">Notes Only</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" className="w-full">
                  <Filter className="w-4 h-4 mr-2" />
                  Advanced Filters
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="semantic" className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Semantic search uses AI to understand the meaning of your query and find related content even if it doesn't contain the exact words.
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Search Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Search Results ({results.length} found)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="space-y-4 p-6">
                  {results.map((result) => (
                    <Card key={result.id} className={`border-l-4 ${getTypeColor(result.type)}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getTypeIcon(result.type)}
                              <h3 className="font-semibold text-[hsl(var(--navy-primary))]">
                                {result.title}
                              </h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                              {result.excerpt}
                            </p>
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="outline" className="text-xs">
                                {result.volume}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {result.chapter}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Page {result.page}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <div className="w-2 h-2 bg-[hsl(var(--success-green))] rounded-full"></div>
                                {Math.round(result.relevanceScore * 100)}% match
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Search Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Search Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium mb-1">Full-Text Search</h4>
                <p className="text-muted-foreground">Search for exact words and phrases in the manual content.</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Semantic Search</h4>
                <p className="text-muted-foreground">Find related concepts even if exact words don't match.</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Use Quotes</h4>
                <p className="text-muted-foreground">Use "quotes" to search for exact phrases.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Searches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {['decompression procedures', 'emergency ascent', 'dive tables', 'safety protocols'].map((term) => (
                <Button
                  key={term}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-8"
                  onClick={() => setSearchQuery(term)}
                >
                  {term}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}