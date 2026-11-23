/* MMM-Layout
 * Keeps modules from overlapping when they are moved, shown or hidden.
 *
 * MagicMirror positions each region on its own, so a wide module in a corner
 * can run under the centered module next to it (e.g. long headlines under the
 * clock). This helper measures the screen whenever the layout changes and sets
 * two CSS variables that modules can use:
 *
 *   --region-max-width   on left/right regions: the space beside the centered
 *                        module in the same row (half the screen if empty)
 *   --region-max-height  on bottom left/right regions: the space below the
 *                        module above it in the same column
 *
 * Add it once to config.js without a position: { module: "MMM-Layout" }
 */
Module.register("MMM-Layout", {

  defaults: {
    gap: 24 // px kept between neighbouring regions
  },

  notificationReceived: function (notification) {
    if (notification === "DOM_OBJECTS_CREATED") {
      this.watchLayout();
    }
  },

  // Re-measure whenever any region changes size or gains/loses a module
  watchLayout: function () {
    const schedule = () => {
      if (this.frame) {
        return;
      }
      this.frame = requestAnimationFrame(() => {
        this.frame = null;
        this.updateLayout();
      });
    };

    const resizeObserver = new ResizeObserver(schedule);
    const mutationObserver = new MutationObserver(schedule);

    document.querySelectorAll(".region").forEach(region => {
      resizeObserver.observe(region);
      const container = region.querySelector(":scope > .container");
      if (container) {
        // Moving a module (MM.moveModule) re-parents its wrapper
        mutationObserver.observe(container, { childList: true });
        resizeObserver.observe(container);
      }
    });

    window.addEventListener("resize", schedule);
    this.updateLayout();
  },

  // Width of the widest visible module in a region (0 if none)
  visibleWidth: function (region) {
    if (!region) {
      return 0;
    }
    let width = 0;
    region.querySelectorAll(":scope > .container > .module").forEach(module => {
      if (!module.classList.contains("hidden") && module.offsetWidth > 0) {
        width = Math.max(width, module.getBoundingClientRect().width);
      }
    });
    return width;
  },

  // Bottom edge of the visible modules in a region (null if none)
  visibleBottom: function (region) {
    if (!region) {
      return null;
    }
    let bottom = null;
    region.querySelectorAll(":scope > .container > .module").forEach(module => {
      if (!module.classList.contains("hidden") && module.offsetHeight > 0) {
        const rect = module.getBoundingClientRect();
        bottom = bottom === null ? rect.bottom : Math.max(bottom, rect.bottom);
      }
    });
    return bottom;
  },

  setVar: function (element, name, px) {
    if (!element) {
      return;
    }
    const value = Math.max(0, Math.floor(px)) + "px";
    // Only write when it changes, so observers don't loop
    if (element.style.getPropertyValue(name) !== value) {
      element.style.setProperty(name, value);
    }
  },

  updateLayout: function () {
    const body = document.body.getBoundingClientRect();
    const gap = this.config.gap;

    // Width: corner modules share the row with whatever is centered
    ["top", "bottom"].forEach(row => {
      const centerWidth = this.visibleWidth(document.querySelector(`.region.${row}.center`));
      const sideWidth = centerWidth > 0
        ? (body.width - centerWidth) / 2 - gap
        : body.width / 2 - gap / 2;

      ["left", "right"].forEach(side => {
        this.setVar(document.querySelector(`.region.${row}.${side}`), "--region-max-width", sideWidth);
      });
    });

    // Height: a bottom corner module may grow up to the module above it
    ["left", "right"].forEach(side => {
      const bottomRegion = document.querySelector(`.region.bottom.${side}`);
      if (!bottomRegion) {
        return;
      }
      const above = this.visibleBottom(document.querySelector(`.region.top.${side}`));
      const top = above === null ? body.top : above;
      const floor = bottomRegion.getBoundingClientRect().bottom;
      this.setVar(bottomRegion, "--region-max-height", floor - top - gap);
    });
  },

  getStyles: function () {
    return ["MMM-Layout.css"];
  }

});
