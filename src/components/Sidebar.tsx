import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  BookOpen, 
  Smartphone, 
  MessageCircle, 
  User, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Food Log", path: "/food-log", icon: BookOpen },
  { title: "Smart Device", path: "/smart-device", icon: Smartphone },
  { title: "Chatbot", path: "/chatbot", icon: MessageCircle },
  { title: "Profile", path: "/profile", icon: User },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Mobile overlay */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full bg-card/50 backdrop-blur-xl border-r border-border z-50
        transition-all duration-300 ease-in-out
        ${isCollapsed ? '-translate-x-full lg:w-20' : 'w-64'}
        lg:translate-x-0 lg:relative lg:z-auto
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg gradient-success flex items-center justify-center">
                <span className="text-lg font-bold text-success-foreground">AI</span>
              </div>
              <h1 className="font-semibold text-lg">Nutrition Analyzer</h1>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="lg:hidden"
          >
            {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`
                  sidebar-item group relative
                  ${isActive(item.path) ? 'active' : ''}
                `}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium">{item.title}</span>
                )}
                
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="
                    absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground 
                    rounded-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100
                    transition-opacity duration-200 pointer-events-none z-50
                  ">
                    {item.title}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout button */}
        <div className="absolute bottom-4 left-4 right-4">
          <Button 
            variant="destructive" 
            className={`w-full justify-start gap-3 ${isCollapsed ? 'px-2' : ''}`}
            onClick={() => alert('Logout clicked!')}
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span>Logout</span>}
          </Button>
        </div>
      </div>

      {/* Mobile toggle button */}
      {isCollapsed && (
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-40 lg:hidden"
          onClick={() => setIsCollapsed(false)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
    </>
  );
}