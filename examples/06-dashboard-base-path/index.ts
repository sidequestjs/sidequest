import { logger, Sidequest } from "sidequest";
import { TestJob } from "./test-job.js";

async function main() {
  logger().info("Starting Sidequest with dashboard base path...");

  await Sidequest.start({
    backend: {
      driver: "@sidequest/sqlite-backend",
      config: "./sidequest.sqlite",
    },
    dashboard: {
      enabled: true,
      port: 8678,
      basePath: "/admin/sidequest",
    },
    queues: [{ name: "default", concurrency: 1 }],
  });

  logger().info("\n✅ Sidequest started!");
  logger().info("🌐 Dashboard should be accessible at: http://localhost:8678/admin/sidequest");
  logger().info("\n📝 Testing URLs:");
  logger().info("   - Dashboard: http://localhost:8678/admin/sidequest/");
  logger().info("   - Jobs:      http://localhost:8678/admin/sidequest/jobs");
  logger().info("   - Queues:    http://localhost:8678/admin/sidequest/queues");
  logger().info("   - Logo:      http://localhost:8678/admin/sidequest/public/img/logo.png");
  logger().info("   - Styles:    http://localhost:8678/admin/sidequest/public/css/styles.css");

  // Enqueue some test jobs
  logger().info("\n📦 Enqueueing test jobs...");
  for (let i = 1; i <= 5; i++) {
    await Sidequest.build(TestJob).enqueue();
    logger().info(`   ✓ Job ${i} enqueued`);
  }

  logger().info("\n⚠️  Note: The dashboard should NOT be accessible at http://localhost:8678/ (without base path)");
  logger().info("💡 Try accessing the dashboard and verify:");
  logger().info("   1. All assets load correctly (logo, styles, scripts)");
  logger().info("   2. Navigation links work (Dashboard, Jobs, Queues)");
  logger().info("   3. Job actions work (run, cancel, rerun)");
  logger().info("   4. HTMX polling/updates work correctly");
  logger().info("\n🛑 Press Ctrl+C to stop\n");
}

// eslint-disable-next-line no-console
main().catch(console.error);
