import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Plus, Play, RotateCcw, Download, Upload, Brain, Shuffle, Target } from "lucide-react";

interface Deck {
  id: string;
  title: string;
  description: string;
  cardCount: number;
  studyProgress: number;
  lastStudied: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  isPublic: boolean;
}

const mockDecks: Deck[] = [
  {
    id: '1',
    title: 'Decompression Fundamentals',
    description: 'Essential concepts for understanding decompression theory and practice',
    cardCount: 24,
    studyProgress: 75,
    lastStudied: '2 hours ago',
    difficulty: 'Intermediate',
    category: 'Decompression',
    isPublic: false
  },
  {
    id: '2',
    title: 'Emergency Procedures',
    description: 'Critical emergency response procedures every diver must know',
    cardCount: 18,
    studyProgress: 45,
    lastStudied: '1 day ago', 
    difficulty: 'Advanced',
    category: 'Safety',
    isPublic: true
  },
  {
    id: '3',
    title: 'Diving Physics Basics',
    description: 'Fundamental physics principles that apply to diving operations',
    cardCount: 32,
    studyProgress: 90,
    lastStudied: '3 days ago',
    difficulty: 'Beginner',
    category: 'Physics',
    isPublic: true
  }
];

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'Beginner': return 'bg-[hsl(var(--success-green))] text-white';
    case 'Intermediate': return 'bg-[hsl(var(--warning-amber))] text-[hsl(var(--tactical-dark))]';
    case 'Advanced': return 'bg-[hsl(var(--caution-orange))] text-white';
    default: return 'bg-muted';
  }
};

export default function Flashcards() {
  const [selectedTab, setSelectedTab] = useState('my-decks');
  const [creationMode, setCreationMode] = useState('auto');

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[hsl(var(--navy-primary))]">
            <CreditCard className="w-5 h-5" />
            Flashcard Study System
          </CardTitle>
          <p className="text-muted-foreground">
            Enhance your knowledge retention with spaced repetition and active recall techniques
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button variant="hero" size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Create New Deck
            </Button>
            <Button variant="outline" size="lg">
              <Upload className="w-4 h-4 mr-2" />
              Import Deck
            </Button>
            <Button variant="outline" size="lg">
              <Download className="w-4 h-4 mr-2" />
              Export Decks
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="my-decks">My Decks</TabsTrigger>
          <TabsTrigger value="create">Create Deck</TabsTrigger>
          <TabsTrigger value="study">Study Mode</TabsTrigger>
        </TabsList>

        <TabsContent value="my-decks" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockDecks.map((deck) => (
              <Card key={deck.id} className="hover:shadow-[var(--shadow-tactical)] transition-shadow duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-[hsl(var(--navy-primary))]">
                        {deck.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {deck.description}
                      </p>
                    </div>
                    {deck.isPublic && (
                      <Badge variant="outline" className="status-note text-xs">
                        Public
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{deck.studyProgress}%</span>
                  </div>
                  <Progress value={deck.studyProgress} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <Badge className={getDifficultyColor(deck.difficulty)}>
                      {deck.difficulty}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {deck.cardCount} cards
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Last studied: {deck.lastStudied}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="tactical" size="sm" className="flex-1">
                      <Play className="w-3 h-3 mr-1" />
                      Study
                    </Button>
                    <Button variant="outline" size="sm">
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Flashcard Deck</CardTitle>
              <p className="text-muted-foreground">
                Choose how you'd like to create your flashcard deck
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className={`cursor-pointer border-2 ${creationMode === 'auto' ? 'border-[hsl(var(--navy-accent))]' : 'border-border'}`}
                      onClick={() => setCreationMode('auto')}>
                  <CardContent className="p-6 text-center">
                    <Brain className="w-8 h-8 mx-auto mb-3 text-[hsl(var(--navy-accent))]" />
                    <h3 className="font-semibold mb-2">Auto-Generate</h3>
                    <p className="text-sm text-muted-foreground">
                      Generate cards from manual chapters or sections
                    </p>
                  </CardContent>
                </Card>

                <Card className={`cursor-pointer border-2 ${creationMode === 'random' ? 'border-[hsl(var(--navy-accent))]' : 'border-border'}`}
                      onClick={() => setCreationMode('random')}>
                  <CardContent className="p-6 text-center">
                    <Shuffle className="w-8 h-8 mx-auto mb-3 text-[hsl(var(--navy-accent))]" />
                    <h3 className="font-semibold mb-2">Random Topics</h3>
                    <p className="text-sm text-muted-foreground">
                      Generate random cards from selected topics
                    </p>
                  </CardContent>
                </Card>

                <Card className={`cursor-pointer border-2 ${creationMode === 'manual' ? 'border-[hsl(var(--navy-accent))]' : 'border-border'}`}
                      onClick={() => setCreationMode('manual')}>
                  <CardContent className="p-6 text-center">
                    <Target className="w-8 h-8 mx-auto mb-3 text-[hsl(var(--navy-accent))]" />
                    <h3 className="font-semibold mb-2">Manual Creation</h3>
                    <p className="text-sm text-muted-foreground">
                      Create cards manually with custom content
                    </p>
                  </CardContent>
                </Card>
              </div>

              {creationMode === 'auto' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Source Volume</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select volume" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vol1">Volume 1: Diving Principles</SelectItem>
                          <SelectItem value="vol2">Volume 2: Decompression</SelectItem>
                          <SelectItem value="vol3">Volume 3: Mixed Gas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Chapter/Section</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select chapter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ch9">Chapter 9: Decompression</SelectItem>
                          <SelectItem value="ch10">Chapter 10: Mixed Gas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button variant="hero" className="w-full">
                    Generate Flashcards
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="study" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Study Session</CardTitle>
              <p className="text-muted-foreground">
                Practice with spaced repetition for optimal retention
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Study Modes</h3>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Brain className="w-4 h-4 mr-2" />
                      Spaced Repetition (SM-2)
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Shuffle className="w-4 h-4 mr-2" />
                      Random Practice
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Target className="w-4 h-4 mr-2" />
                      Focused Review
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold">Quick Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Cards due today</span>
                      <Badge variant="outline">12</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Study streak</span>
                      <Badge className="bg-[hsl(var(--success-green))] text-white">7 days</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total mastered</span>
                      <Badge variant="outline">156</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}