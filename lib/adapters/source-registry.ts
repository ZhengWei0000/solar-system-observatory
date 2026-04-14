export interface SourceAdapterDescriptor {
  id: string;
  label: string;
  category: "orbit" | "physical" | "shape" | "content";
  homepage: string;
  notes: string;
}

export const sourceRegistry: SourceAdapterDescriptor[] = [
  {
    id: "jpl-horizons",
    label: "JPL Horizons API",
    category: "orbit",
    homepage: "https://ssd-api.jpl.nasa.gov/doc/horizons.html",
    notes: "Primary source for offline-cached real trajectory vectors used by overview and featured system pages.",
  },
  {
    id: "jpl-ssd-planets",
    label: "JPL SSD Planetary Physical Parameters",
    category: "physical",
    homepage: "https://ssd.jpl.nasa.gov/planets/phys_par.html",
    notes: "Primary source for planet-scale physical fields.",
  },
  {
    id: "jpl-ssd-satellites",
    label: "JPL SSD Planetary Satellite Physical Parameters",
    category: "physical",
    homepage: "https://ssd.jpl.nasa.gov/sats/phys_par/",
    notes: "Primary source for moon-scale physical fields; paired with SSD discovery data for catalog normalization.",
  },
  {
    id: "nasa-3d-resources",
    label: "NASA 3D Resources",
    category: "shape",
    homepage: "https://science.nasa.gov/3d-resources/",
    notes: "Preferred source for official featured-body glTF assets when locally bundled.",
  },
];
