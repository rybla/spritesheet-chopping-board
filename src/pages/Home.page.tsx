import { ColorSchemeToggle } from "@/components/ColorSchemeToggle/ColorSchemeToggle";
import { Welcome } from "@/components/Welcome/Welcome";
import classes from "@/pages/Home.module.css";

export function HomePage() {
  return (
    <div className={classes["page"]}>
      <Welcome />
      <ColorSchemeToggle />
    </div>
  );
}
