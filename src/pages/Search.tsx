import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search as SearchIcon, Filter, BookOpen, ExternalLink, AlertTriangle, Info, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'full-text' | 'semantic'>('full-text');
  const [volumeFilter, setVolumeFilter] = useState('all');
  const [safetyFilter, setSafetyFilter] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search query required",
        description: "Please enter a search term",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search', {
        body: {
          query: searchQuery,
          searchType: searchMode,
          volumeFilter,
          safetyFilter,
          page: currentPage,
          pageSize: 20
        }
      });

      if (error) throw error;

      setResults(data.results || []);
      setTotalResults(data.totalCount || 0);
      
      toast({
        title: "Search completed",
        description: `Found ${data.totalCount || 0} results`
      });
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[hsl(var(--navy-primary))]">
            <SearchIcon className="w-5 h-5" />
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
            <Button onClick={handleSearch} size="lg" variant="hero" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <SearchIcon className="w-4 h-4 mr-2" />
              )}
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as 'full-text' | 'semantic')} className="w-full">
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
                Search Results ({totalResults} found)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="space-y-4 p-6">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--navy-primary))]" />
                      <p className="text-muted-foreground">Searching the manual...</p>
                    </div>
                  ) : results.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <SearchIcon className="w-12 h-12 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {searchQuery ? 'No results found. Try different search terms.' : 'Enter a search query to begin.'}
                      </p>
                    </div>
                  ) : (
                    results.map((result) => (
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
                    ))
                  )}
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
              <CardTitle className="text-sm">Quick Searches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {['decompression procedures', 'emergency ascent', 'dive tables', 'safety protocols'].map((term) => (
                <Button
                  key={term}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-8"
                  onClick={() => {
                    setSearchQuery(term);
                    setTimeout(handleSearch, 100);
                  }}
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