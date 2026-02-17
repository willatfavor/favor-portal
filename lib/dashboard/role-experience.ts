import { formatCurrency } from "@/lib/utils";
import type { ConstituentType, FoundationGrant, Gift } from "@/types";

type RoleHighlightItem = {
  title: string;
  value: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

type RoleActionItem = {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
};

export type RoleExperience = {
  anchorId: string;
  highlights: {
    title: string;
    subtitle: string;
    items: RoleHighlightItem[];
  };
  actionsTitle: string;
  actionsSubtitle: string;
  actions: RoleActionItem[];
  recommendedTags: string[];
  contentTitle: string;
  contentSubtitle: string;
};

type BuildRoleExperienceInput = {
  userType: ConstituentType;
  gifts: Gift[];
  grants: FoundationGrant[];
  tierName: string;
  recommendedCourseTitle?: string;
  rddAssignment?: string;
};

export function buildRoleExperience({
  userType,
  gifts,
  grants,
  tierName,
  recommendedCourseTitle,
  rddAssignment,
}: BuildRoleExperienceInput): RoleExperience {
  switch (userType) {
    case "foundation": {
      const active = grants.filter((g) => g.status === "active");
      const nextReport = active.find((g) => g.nextReportDue)?.nextReportDue;
      return {
        anchorId: "foundation",
        highlights: {
          title: "Grant Portfolio",
          subtitle: "Reporting cadence and active funding milestones",
          items: [
            {
              title: "Active Grants",
              value: `${active.length}`,
              description: "Currently funded initiatives",
            },
            {
              title: "Next Report Due",
              value: nextReport
                ? new Date(nextReport).toLocaleDateString()
                : "None scheduled",
              description: "Upcoming reporting deadline",
            },
            {
              title: "Board Materials",
              value: "Prepared",
              description: "Latest briefing packet is ready",
              actionLabel: "View reports",
              actionHref: "/content?type=report",
            },
          ],
        },
        actionsTitle: "Foundation Actions",
        actionsSubtitle: "Keep grant reporting and stewardship aligned",
        actions: [
          {
            title: "Grant Reporting Timeline",
            description: "Track milestones and report submissions",
            actionLabel: "Open timeline",
            actionHref: "/giving?view=grants",
          },
          {
            title: "Impact Metrics Snapshot",
            description: "Board-ready metrics updated weekly",
            actionLabel: "Download metrics",
            actionHref: "/content?tag=foundation",
          },
          {
            title: "Site Visit Requests",
            description: "Coordinate visits and field updates",
            actionLabel: "Request visit",
            actionHref: "/content?tag=site-visit",
          },
        ],
        recommendedTags: ["grant", "report", "foundation", "board"],
        contentTitle: "Board-ready resources",
        contentSubtitle: "Briefings and reports curated for your team",
      };
    }
    case "church":
      return {
        anchorId: "church",
        highlights: {
          title: "Congregation Briefing",
          subtitle: "Resources and engagement tools for your church",
          items: [
            {
              title: "Mission Sunday Kit",
              value: "Updated",
              description: "Slides, videos, and bulletin inserts",
              actionLabel: "Open resources",
              actionHref: "/content?tag=church",
            },
            {
              title: "Upcoming Events",
              value: "2",
              description: "Partner gatherings in the next 60 days",
            },
            {
              title: "Material Requests",
              value: "Ready",
              description: "Order brochures and prayer guides",
            },
          ],
        },
        actionsTitle: "Church Actions",
        actionsSubtitle: "Keep your congregation connected",
        actions: [
          {
            title: "Plan Mission Sunday",
            description: "Invite Favor for a Sunday feature",
            actionLabel: "View toolkit",
            actionHref: "/content?tag=mission-sunday",
          },
          {
            title: "Congregation Engagement",
            description: "Prayer prompts and small-group guides",
            actionLabel: "Download guides",
            actionHref: "/content?tag=church",
          },
          {
            title: "Bulk Materials",
            description: "Order brochures and prayer guides",
            actionLabel: "Request materials",
            actionHref: "/content?tag=materials",
          },
        ],
        recommendedTags: ["church", "pastor", "resource", "event"],
        contentTitle: "Church resources",
        contentSubtitle: "Materials designed for congregational use",
      };
    case "daf": {
      const dafTotal = gifts
        .filter((g) => g.designation.toLowerCase().includes("daf"))
        .reduce((sum, g) => sum + g.amount, 0);
      return {
        anchorId: "daf",
        highlights: {
          title: "Grant Recommendation Snapshot",
          subtitle: "Stewardship details and recommended next steps",
          items: [
            {
              title: "DAF Giving YTD",
              value: formatCurrency(dafTotal),
              description: "Based on portal activity",
            },
            {
              title: "Grant Checklist",
              value: "Available",
              description: "Steps to submit your next recommendation",
              actionLabel: "Open checklist",
              actionHref: "/giving?view=daf",
            },
            {
              title: "RDD Contact",
              value: rddAssignment ?? "Partner Care",
              description: "Your DAF support contact",
            },
          ],
        },
        actionsTitle: "DAF Actions",
        actionsSubtitle: "Simplify your recommendation workflow",
        actions: [
          {
            title: "Start a Recommendation",
            description: "Prepare your next DAF grant",
            actionLabel: "Open checklist",
            actionHref: "/giving?view=daf",
          },
          {
            title: "DAF Documentation",
            description: "Download letters and EIN details",
            actionLabel: "View docs",
            actionHref: "/content?tag=daf",
          },
          {
            title: "Stewardship Summary",
            description: "Year-to-date impact summary",
            actionLabel: "View summary",
            actionHref: "/content?type=report",
          },
        ],
        recommendedTags: ["daf", "report", "grant"],
        contentTitle: "DAF-ready documentation",
        contentSubtitle: "Letters and summaries for your provider",
      };
    }
    case "ambassador":
      return {
        anchorId: "ambassador",
        highlights: {
          title: "Advocacy Briefing",
          subtitle: "Momentum, outreach, and next actions",
          items: [
            {
              title: "Campaign Momentum",
              value: "Rising",
              description: "Engagement up 12% this month",
            },
            {
              title: "Shareable Assets",
              value: "6 new",
              description: "Updated ambassador toolkit",
              actionLabel: "View assets",
              actionHref: "/content?tag=ambassador",
            },
            {
              title: "Next Event",
              value: "April 9",
              description: "Ambassador Training Day",
            },
          ],
        },
        actionsTitle: "Ambassador Actions",
        actionsSubtitle: "Tools to help you advocate",
        actions: [
          {
            title: "Shareable Assets",
            description: "Download the latest toolkit",
            actionLabel: "Open toolkit",
            actionHref: "/content?tag=ambassador",
          },
          {
            title: "Upcoming Training",
            description: "Register for the next cohort",
            actionLabel: "View schedule",
            actionHref: "/content?tag=training",
          },
          {
            title: "Campaign Goals",
            description: "Track your outreach milestones",
            actionLabel: "View goals",
            actionHref: "/dashboard#ambassador",
          },
        ],
        recommendedTags: ["ambassador", "campaign", "training"],
        contentTitle: "Advocacy resources",
        contentSubtitle: "Scripts, assets, and campaign updates",
      };
    case "volunteer":
      return {
        anchorId: "volunteer",
        highlights: {
          title: "Volunteer Briefing",
          subtitle: "Assignments, training, and support",
          items: [
            {
              title: "Active Tasks",
              value: "3",
              description: "Assignments currently in progress",
            },
            {
              title: "Next Training",
              value: "Feb 20",
              description: "Volunteer welcome session",
            },
            {
              title: "Resources",
              value: "Updated",
              description: "Orientation pack and checklists",
              actionLabel: "Open resources",
              actionHref: "/content?tag=volunteer",
            },
          ],
        },
        actionsTitle: "Volunteer Actions",
        actionsSubtitle: "Stay on track with assignments",
        actions: [
          {
            title: "Assignments",
            description: "Review current tasks and updates",
            actionLabel: "View tasks",
            actionHref: "/dashboard#volunteer",
          },
          {
            title: "Training Schedule",
            description: "Prepare for upcoming sessions",
            actionLabel: "View training",
            actionHref: "/content?tag=training",
          },
          {
            title: "Volunteer Toolkit",
            description: "Orientation pack and checklists",
            actionLabel: "Open toolkit",
            actionHref: "/content?tag=volunteer",
          },
        ],
        recommendedTags: ["volunteer", "training", "resource"],
        contentTitle: "Volunteer resources",
        contentSubtitle: "Guides and materials for your role",
      };
    case "major_donor":
      return {
        anchorId: "stewardship",
        highlights: {
          title: "Stewardship Briefing",
          subtitle: "Strategic updates and priority initiatives",
          items: [
            {
              title: "Strategic Initiatives",
              value: "3 active",
              description: "Priority expansion projects",
              actionLabel: "View initiatives",
              actionHref: "/giving/impact",
            },
            {
              title: "Financial Summary",
              value: "Ready",
              description: "Board-ready financial packet",
              actionLabel: "View reports",
              actionHref: "/content?type=report",
            },
            {
              title: "RDD Contact",
              value: rddAssignment ?? "Partner Care",
              description: "Schedule your next update",
              actionLabel: "Request update",
              actionHref: "/support?topic=strategic-call",
            },
          ],
        },
        actionsTitle: "Stewardship Actions",
        actionsSubtitle: "Plan your next strategic touchpoint",
        actions: [
          {
            title: "Executive Briefing",
            description: "Latest stewardship packet",
            actionLabel: "View packet",
            actionHref: "/content?tag=stewardship",
          },
          {
            title: "Schedule RDD Update",
            description: "Request a strategic call",
            actionLabel: "Request update",
            actionHref: "/support?topic=strategic-call",
          },
          {
            title: "Impact Milestones",
            description: "See progress on priority initiatives",
            actionLabel: "View milestones",
            actionHref: "/giving/impact",
          },
        ],
        recommendedTags: ["stewardship", "report", "impact", "financial"],
        contentTitle: "Strategic insights",
        contentSubtitle: "Stewardship updates curated for you",
      };
    default:
      return {
        anchorId: "partner",
        highlights: {
          title: "Partner Briefing",
          subtitle: "Your partnership highlights and next steps",
          items: [
            {
              title: "Giving Tier",
              value: tierName,
              description: "Current partnership tier",
            },
            {
              title: "Recommended Course",
              value: recommendedCourseTitle ?? "Browse courses",
              description: "Continue your learning journey",
              actionLabel: "View courses",
              actionHref: "/courses",
            },
            {
              title: "Impact Report",
              value: "Q4 2025",
              description: "Latest report ready to download",
              actionLabel: "View report",
              actionHref: "/content?type=report",
            },
          ],
        },
        actionsTitle: "Partner Actions",
        actionsSubtitle: "Make the most of your partnership",
        actions: [
          {
            title: "Give a Gift",
            description: "Support a program that matters to you",
            actionLabel: "Start a gift",
            actionHref: "/giving",
          },
          {
            title: "Explore Courses",
            description: "Deepen your understanding of Favor's work",
            actionLabel: "Browse courses",
            actionHref: "/courses",
          },
          {
            title: "Download Reports",
            description: "Latest quarterly impact summary",
            actionLabel: "Open reports",
            actionHref: "/content?type=report",
          },
        ],
        recommendedTags: ["impact", "report", "update", "partner"],
        contentTitle: "Recommended for you",
        contentSubtitle: "Updates curated for your partnership",
      };
  }
}
