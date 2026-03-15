"use client"

import * as React from "react"
import {
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  LayoutDashboard,
  Mail,
  Users,
  Inbox,
  RocketIcon,
  Mailbox,
  PenSquare,
  Bug,
  Kanban,
  Brain
} from "lucide-react"

import { NavMain } from "./nav-main"
import { NavProjects } from "./nav-projects"
import { NavUser } from "./nav-user"
import { TeamSwitcher } from "./team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "./ui/sidebar"

// Navigation data derived from app/layout.js links
const data = {
  user: {
    name: "Pinova",
    email: "support@pinova.in",
    avatar: "/pinova.jpg",
  },
  teams: [
    { name: "Pinova", logo: GalleryVerticalEnd, plan: "Prod" },
  ],
  navMain: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "CRM Pulse", url: "/crm", icon: Brain, badge: "New" },
    { title: "Pipeline", url: "/pipeline", icon: Kanban, badge: "AI" },
    { title: "Campaigns", url: "/campaigns", icon: RocketIcon },
    { title: "Prospects", url: "/prospects", icon: Users },
    { title: "Emails", url: "/emails", icon: Mail },
    { title: "Mailboxes", url: "/mailboxes", icon: Mailbox },
    { title: "Compose", url: "/compose", icon: PenSquare },
    { title: "Debug", url: "/debug", icon: Bug },
    { title: "Settings", url: "/settings", icon: Settings2 },

  ],
  projects: [],
}

export function AppSidebar({
  ...props
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
