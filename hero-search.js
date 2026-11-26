
(function () {
  'use strict';

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function buildIndex(categories) {
    return categories.map(function (category) {
      var terms = [
        category.label,
        category.id,
        category.description,
        category.cardDescription,
        category.cardCta
      ];

      (category.presets || []).forEach(function (preset) {
        terms.push(
          preset.label,
          preset.id,
          preset.description,
          preset.editorTitle,
          preset.dimensions
        );
      });

      return {
        category: category,
        searchText: normalize(terms.join(' '))
      };
    });
  }

  function matches(searchText, query) {
    var words = normalize(query).split(/\s+/).filter(Boolean);

    return words.every(function (word) {
      return searchText.includes(word);
    });
  }

  function findCard(entry, cards, index, total) {
    var category = entry.category;

    // First: match the category's actual CSS class.
    var card = cards.find(function (element) {
      return category.cardClass &&
        element.classList.contains(category.cardClass);
    });

    if (card) return card;

    // Second: match a category ID if one exists on the card.
    card = cards.find(function (element) {
      var data = element.dataset || {};

      return data.category === category.id ||
        data.categoryId === category.id ||
        data.workspace === category.id;
    });

    if (card) return card;

    // Third: match the visible category title.
    card = cards.find(function (element) {
      return normalize(element.textContent)
        .includes(normalize(category.label));
    });

    if (card) return card;

    // Last resort: use registry order if the counts match.
    if (cards.length === total) {
      return cards[index] || null;
    }

    return null;
  }

  function init() {
    var input = document.getElementById('createCategorySearch');
    var button = document.getElementById('createCategorySearchButton');
    var grid = document.getElementById('creationCategoryRow');
    var empty = document.getElementById('categorySearchEmpty');
    var registry = window.FLOWVA_WORKSPACES;

    if (
      !input ||
      !button ||
      !grid ||
      !registry ||
      !Array.isArray(registry.categories)
    ) return;

    // Build searchable category and preset information only once.
    var index = buildIndex(registry.categories);

    function applySearch() {
      var query = input.value;
      var cards = Array.from(grid.children).filter(function (element) {
        return element.classList.contains('workspace-card');
      });

      var visibleCount = 0;

      index.forEach(function (entry, i) {
        var card = findCard(entry, cards, i, index.length);

        if (!card) return;

        var isMatch = matches(entry.searchText, query);

        // Set display directly because the card CSS defines display:block.
        card.style.display = isMatch ? '' : 'none';
        card.setAttribute('aria-hidden', isMatch ? 'false' : 'true');

        if (isMatch) visibleCount++;
      });

      if (empty) {
        empty.hidden = visibleCount > 0 || !normalize(query);
      }
    }

    // Search while typing.
    input.addEventListener('input', applySearch);

    // Search button.
    button.addEventListener('click', function () {
      applySearch();
      input.focus();
    });

    // Keyboard support.
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        applySearch();
      }

      if (event.key === 'Escape') {
        input.value = '';
        applySearch();
      }
    });

    // Run after the workspace cards have been rendered.
    applySearch();

    // Reapply if the app renders or refreshes the cards later.
    if (typeof MutationObserver !== 'undefined') {
      var observer = new MutationObserver(function () {
        applySearch();
      });

      observer.observe(grid, {
        childList: true
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
