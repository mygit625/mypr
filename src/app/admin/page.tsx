"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  FileText,
  Activity,
  TrendingUp,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Zap,
  Globe
} from 'lucide-react';

const stats = [
  {
    title: 'Total Users',
    value: '12,345',
    change: '+12%',
    trend: 'up',
    icon: Users,
    color: 'text-blue-600'
  },
  {
    title: 'Tools Used Today',
    value: '8,432',
    change: '+8%',
    trend: 'up',
    icon: Zap,
    color: 'text-green-600'
  },
  {
    title: 'Files Processed',
    value: '45,678',
    change: '+23%',
    trend: 'up',
    icon: FileText,
    color: 'text-purple-600'
  },
  {
    title: 'Active Sessions',
    value: '1,234',
    change: '-5%',
    trend: 'down',
    icon: Activity,
    color: 'text-orange-600'
  }
];

const recentActivity = [
  {
    user: 'john.doe@example.com',
    action: 'Merged PDF files',
    tool: 'PDF Merge',
    time: '2 minutes ago',
    status: 'success'
  },
  {
    user: 'jane.smith@example.com',
    action: 'Converted JPG to PDF',
    tool: 'JPG to PDF',
    time: '5 minutes ago',
    status: 'success'
  },
  {
    user: 'bob.wilson@example.com',
    action: 'Split PDF document',
    tool: 'PDF Split',
    time: '8 minutes ago',
    status: 'success'
  },
  {
    user: 'alice.brown@example.com',
    action: 'Compressed PDF file',
    tool: 'PDF Compress',
    time: '12 minutes ago',
    status: 'error'
  },
  {
    user: 'charlie.davis@example.com',
    action: 'Added watermark to PDF',
    tool: 'PDF Watermark',
    time: '15 minutes ago',
    status: 'success'
  }
];

const systemHealth = [
  { name: 'API Response Time', value: 95, status: 'good' },
  { name: 'Server Uptime', value: 99.9, status: 'excellent' },
  { name: 'Database Performance', value: 87, status: 'good' },
  { name: 'Storage Usage', value: 65, status: 'warning' },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with ToolsInn today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest user actions across all tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {activity.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.user}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.action} using {activity.tool}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Current system performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {systemHealth.map((metric) => (
              <div key={metric.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{metric.name}</span>
                  <span className="font-medium">{metric.value}%</span>
                </div>
                <Progress 
                  value={metric.value} 
                  className={`h-2 ${
                    metric.status === 'excellent' ? 'text-green-600' :
                    metric.status === 'good' ? 'text-blue-600' :
                    'text-yellow-600'
                  }`}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Users className="h-5 w-5" />
              <span>Manage Users</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <BarChart3 className="h-5 w-5" />
              <span>View Analytics</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <FileText className="h-5 w-5" />
              <span>System Logs</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Globe className="h-5 w-5" />
              <span>Site Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}