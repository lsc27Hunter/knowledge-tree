import { useTheme } from "../../theme/ThemeProvider";
import { Toaster } from "sonner";

/** Toast host — follows light/dark theme. */
export function AppToaster() {
  const { theme } = useTheme();

  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast:
            "font-inter !bg-primary-grey !border !border-border !text-fg !shadow-[var(--shadow-card)]",
          title: "!text-fg",
          description: "!text-primary-light-grey",
          success: "!border-success-green",
          error: "!border-danger-red",
          warning: "!border-warning-yellow",
        },
      }}
    />
  );
}
