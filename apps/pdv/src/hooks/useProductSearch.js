// =============================================================
// useProductSearch.js — Hook de busca de produtos com debounce
// =============================================================
import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../services/api";

const useProductSearch = (products, addToCart) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const searchInputRef = useRef(null);
  const searchTimerRef = useRef(null);

  // Debounce search
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    // Match exato por código (instantâneo, sem debounce)
    const exactMatch = products.find(
      (p) => p.codigo.trim() === searchTerm.trim(),
    );
    if (exactMatch) {
      setSearchResults([exactMatch]);
      return;
    }

    // Debounce 300ms para busca por texto
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await api.products.search({
          term: searchTerm,
          limit: 15,
        });
        setSearchResults(results.filter((p) => p.estoque_atual > 0));
      } catch (err) {
        console.error("Erro na busca:", err);
        setSearchResults([]);
      }
    }, 300);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchTerm, products]);

  const handleSearchKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (!searchTerm) return;
        const exactMatch = products.find(
          (p) => p.codigo.trim() === searchTerm.trim(),
        );
        if (exactMatch) {
          addToCart(exactMatch);
          setSearchTerm("");
          setSearchResults([]);
          return;
        }
        if (searchResults.length === 1) {
          addToCart(searchResults[0]);
          setSearchTerm("");
          setSearchResults([]);
        }
      }
    },
    [searchTerm, products, searchResults, addToCart],
  );

  const selectProduct = useCallback(
    (product) => {
      addToCart(product);
      setSearchTerm("");
      setSearchResults([]);
      setTimeout(() => searchInputRef.current?.focus(), 10);
    },
    [addToCart],
  );

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    searchResults,
    searchInputRef,
    handleSearchKeyDown,
    selectProduct,
    focusSearch,
  };
};

export default useProductSearch;
