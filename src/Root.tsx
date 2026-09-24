import App from "./App.tsx";
import { ThemeContext } from "./hooks/theme.context";
import { useAppTheme } from "./hooks/use-theme";

export function Root() {
    const { isDark, toggleTheme } = useAppTheme();
    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            <App />
        </ThemeContext.Provider>
    );
}
