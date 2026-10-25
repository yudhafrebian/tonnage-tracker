export const COLOR_THEME_KEY = "color-theme";
export const COLOR_THEME_DEFAULT = "default";

// Dijalankan di <head> sebelum paint supaya tidak ada kedip warna default saat refresh.
export const colorThemeScript = `try{document.documentElement.setAttribute("data-theme",localStorage.getItem("${COLOR_THEME_KEY}")||"${COLOR_THEME_DEFAULT}")}catch(e){}`;
