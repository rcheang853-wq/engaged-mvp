'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Heart, Calendar, MapPin, DollarSign, Users, Star, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventAnalytics {
  totalSwipes: number;
  interestedCount: number;
  passedCount: number;
  savedEvents: number;
  topCategories: Array<{ name: string; count: number; percentage: number }>;
  avgEventScore: number;
  priceRangePreference: { min: number; max: number };
  timePreferences: Array<{ time: string; count: number }>;
  locationPreferences: Array<{ location: string; count: number }>;
}

interface EventAnalyticsDashboardProps {
  analytics?: EventAnalytics;
  isLoading?: boolean;
  className?: string;
}

export function EventAnalyticsDashboard({
  analytics,
  isLoading = false,
  className
}: EventAnalyticsDashboardProps) {
  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </CardHeader>
            <CardContent>
              <div className="h-24 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={cn("text-center py-12", className)}>
        <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Analytics Yet
        </h3>
        <p className="text-gray-600">
          Start swiping on events to see your preferences and insights!
        </p>
      </div>
    );
  }

  const interestRate = analytics.totalSwipes > 0
    ? (analytics.interestedCount / analytics.totalSwipes) * 100
    : 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Swipes</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalSwipes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Heart className="w-5 h-5 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Interest Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{interestRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Saved Events</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.savedEvents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Star className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Match Score</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.avgEventScore.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Top Categories */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Favorite Categories
            </CardTitle>
            <CardDescription>
              Categories you're most interested in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.topCategories.slice(0, 5).map((category, index) => (
              <div key={category.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    index === 0 ? "bg-blue-500" :
                    index === 1 ? "bg-green-500" :
                    index === 2 ? "bg-purple-500" :
                    index === 3 ? "bg-yellow-500" : "bg-gray-400"
                  )} />
                  <span className="text-sm font-medium text-gray-900">{category.name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-24">
                    <Progress value={category.percentage} className="h-2" />
                  </div>
                  <span className="text-sm text-gray-600 w-12">{category.percentage.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Preferences Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Price Preferences
              </CardTitle>
              <CardDescription>
                Your preferred price range for events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Free</span>
                <span>HK$500+</span>
              </div>
              <div className="relative h-2 bg-gray-200 rounded-full mb-4">
                <div
                  className="absolute h-2 bg-blue-500 rounded-full"
                  style={{
                    left: `${(analytics.priceRangePreference.min / 500) * 100}%`,
                    width: `${((analytics.priceRangePreference.max - analytics.priceRangePreference.min) / 500) * 100}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-sm font-medium text-gray-900">
                <span>HK${analytics.priceRangePreference.min}</span>
                <span>HK${analytics.priceRangePreference.max}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Time Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Time Preferences
              </CardTitle>
              <CardDescription>
                When you prefer to attend events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.timePreferences.map((time, index) => {
                const maxCount = Math.max(...analytics.timePreferences.map(t => t.count));
                const percentage = (time.count / maxCount) * 100;
                return (
                  <div key={time.time} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {time.time}
                    </span>
                    <div className="flex items-center space-x-3">
                      <div className="w-20">
                        <Progress value={percentage} className="h-2" />
                      </div>
                      <span className="text-sm text-gray-600 w-8">{time.count}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Top Locations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Favorite Locations
            </CardTitle>
            <CardDescription>
              Areas where you're most likely to attend events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analytics.locationPreferences.slice(0, 6).map((location, index) => {
                const maxCount = Math.max(...analytics.locationPreferences.map(l => l.count));
                const percentage = (location.count / maxCount) * 100;
                return (
                  <div key={location.location} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 truncate mr-3">
                      {location.location}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16">
                        <Progress value={percentage} className="h-2" />
                      </div>
                      <span className="text-xs text-gray-600">{location.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}