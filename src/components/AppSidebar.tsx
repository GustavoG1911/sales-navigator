import { Home, Target, CalendarDays, Settings, LogOut, DollarSign, Landmark } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth, UserRole } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  comingSoon?: boolean;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Financeiro", url: "/financeiro", icon: Landmark },
  { title: "Prospecção", url: "/prospeccao", icon: Target, comingSoon: true },
  { title: "Agenda", url: "/agenda", icon: CalendarDays, comingSoon: true },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, role } = useAuth();

  const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-primary flex items-center justify-center shrink-0">
                <DollarSign className="h-3 w-3 text-primary-foreground" />
              </div>
              {!collapsed && <span className="font-bold text-sm tracking-tight">DealFlow</span>}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    {item.comingSoon ? (
                      <div className="flex items-center gap-2 cursor-default opacity-60">
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && (
                          <>
                            <span>{item.title}</span>
                            <Badge variant="secondary" className="ml-auto text-[9px] px-1.5 py-0">
                              Em Breve
                            </Badge>
                          </>
                        )}
                      </div>
                    ) : (
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="hover:bg-sidebar-accent/50"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
