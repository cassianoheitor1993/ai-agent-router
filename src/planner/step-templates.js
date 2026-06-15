export const STEP_TEMPLATES = {
  project_scaffold: {
    type: "project_scaffold",
    target: "structure",
    description: "Create project directory structure and all config files",
    produces: ["directory_tree", "package_json", "configs"],
  },
  system_design: {
    type: "system_design",
    target: "architecture",
    description: "Design the complete system architecture",
    produces: ["architecture", "component_tree", "data_flow", "route_map"],
  },
  architecture: {
    type: "architecture",
    target: "architecture",
    description: "Define architecture patterns, module boundaries, and decisions",
    produces: ["architecture_decisions", "module_map"],
  },
  backend_scaffold: {
    type: "backend",
    target: "backend",
    description: "Scaffold backend project with framework setup",
    dependencies: ["project_scaffold"],
    produces: ["project_structure", "entry_point", "configuration"],
  },
  backend_routes: {
    type: "backend",
    target: "backend",
    description: "Implement API routes and controllers",
    dependencies: ["backend_scaffold"],
    produces: ["routes", "controllers", "middleware"],
  },
  backend_services: {
    type: "backend",
    target: "backend",
    description: "Implement business logic services",
    dependencies: ["backend_routes"],
    produces: ["services", "dtos", "interfaces"],
  },
  database_schema: {
    type: "database",
    target: "database",
    description: "Design and generate database schema",
    dependencies: ["project_scaffold"],
    produces: ["schema", "migrations", "models"],
  },
  frontend_scaffold: {
    type: "frontend",
    target: "frontend",
    description: "Scaffold frontend project",
    dependencies: ["project_scaffold"],
    produces: ["project_structure", "configuration"],
  },
  frontend_pages: {
    type: "frontend",
    target: "frontend",
    description: "Implement frontend pages and components",
    dependencies: ["frontend_scaffold"],
    produces: ["pages", "components", "routes"],
  },
  frontend_integration: {
    type: "frontend",
    target: "frontend",
    description: "Connect frontend to backend API",
    dependencies: ["frontend_pages", "backend_routes"],
    produces: ["api_client", "hooks", "types"],
  },
  mobile_scaffold: {
    type: "mobile",
    target: "mobile",
    description: "Scaffold React Native / Expo mobile project",
    dependencies: ["project_scaffold"],
    produces: ["mobile_structure", "navigation"],
  },
  mobile_screens: {
    type: "mobile",
    target: "mobile",
    description: "Implement mobile app screens and components",
    dependencies: ["mobile_scaffold"],
    produces: ["screens", "components", "navigation"],
  },
  mobile_integration: {
    type: "mobile",
    target: "mobile",
    description: "Connect mobile app to backend API",
    dependencies: ["mobile_screens", "backend_routes"],
    produces: ["api_client", "hooks", "auth_flow"],
  },
  testing: {
    type: "testing",
    target: "testing",
    description: "Write unit and integration tests",
    dependencies: ["backend_services", "frontend_pages"],
    produces: ["test_files"],
  },
  review: {
    type: "review",
    target: "quality",
    description: "Review code quality, security, and patterns",
    dependencies: ["backend_services", "frontend_pages", "database_schema"],
    produces: ["review_report", "suggestions"],
  },
  documentation: {
    type: "docs",
    target: "documentation",
    description: "Generate technical documentation",
    dependencies: ["review"],
    produces: ["readme", "api_docs", "architecture_docs"],
  },
  consolidator: {
    type: "consolidator",
    target: "quality",
    description: "Consolidate, deduplicate, and validate the generated project",
    dependencies: ["documentation"],
    produces: ["consolidation_report"],
  },
};

function pushTemplate(arr, key, overrides = {}) {
  const template = { ...STEP_TEMPLATES[key], ...overrides, _key: key };
  arr.push(template);
  return template;
}

export function getStepTemplatesForTask(category, complexity, features = []) {
  const templates = [];

  const needsMobile = features.includes("mobile");
  const isNewProject = category === "system_design" || category === "fullstack";

  switch (category) {
    case "system_design":
    case "fullstack":
      pushTemplate(templates, "project_scaffold");
      pushTemplate(templates, "system_design", { dependencies: ["project_scaffold"] });
      pushTemplate(templates, "database_schema");
      pushTemplate(templates, "backend_scaffold");
      pushTemplate(templates, "backend_routes");
      pushTemplate(templates, "backend_services");
      pushTemplate(templates, "frontend_scaffold");
      pushTemplate(templates, "frontend_pages");
      pushTemplate(templates, "frontend_integration");

      if (needsMobile) {
        pushTemplate(templates, "mobile_scaffold");
        pushTemplate(templates, "mobile_screens");
        pushTemplate(templates, "mobile_integration");
      }

      pushTemplate(templates, "testing");
      pushTemplate(templates, "review");
      pushTemplate(templates, "documentation");
      pushTemplate(templates, "consolidator");
      break;

    case "architecture":
      pushTemplate(templates, "project_scaffold");
      pushTemplate(templates, "architecture", { dependencies: ["project_scaffold"] });
      pushTemplate(templates, "documentation");
      pushTemplate(templates, "consolidator");
      break;

    case "backend":
      pushTemplate(templates, "project_scaffold");
      pushTemplate(templates, "backend_scaffold");
      pushTemplate(templates, "backend_routes");
      pushTemplate(templates, "backend_services");
      pushTemplate(templates, "review");
      pushTemplate(templates, "documentation");
      pushTemplate(templates, "consolidator");
      break;

    case "frontend":
      pushTemplate(templates, "project_scaffold");
      pushTemplate(templates, "frontend_scaffold");
      pushTemplate(templates, "frontend_pages");
      pushTemplate(templates, "frontend_integration");
      pushTemplate(templates, "review");
      pushTemplate(templates, "documentation");
      pushTemplate(templates, "consolidator");
      break;

    case "database":
      pushTemplate(templates, "database_schema");
      pushTemplate(templates, "review");
      pushTemplate(templates, "documentation");
      break;

    case "review":
      pushTemplate(templates, "review");
      pushTemplate(templates, "documentation");
      break;

    case "docs":
      pushTemplate(templates, "documentation");
      break;

    case "testing":
      pushTemplate(templates, "testing");
      pushTemplate(templates, "review");
      break;

    default:
      pushTemplate(templates, "project_scaffold");
      pushTemplate(templates, "system_design", { dependencies: ["project_scaffold"] });
      pushTemplate(templates, "backend_scaffold");
      pushTemplate(templates, "database_schema");
      pushTemplate(templates, "review");
      pushTemplate(templates, "consolidator");
  }

  for (const t of templates) {
    t.complexity = complexity;
  }

  return templates;
}
