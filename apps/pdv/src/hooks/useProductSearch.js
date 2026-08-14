// =============================================================
// useProductSearch.js — Hook de busca de produtos com debounce
// =============================================================
import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../services/api";

const useProductSearch = (products, addToCart) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef(null);
  const searchTimerRef = useRef(null);
  const requestIdRef = useRef(0);

  // Busca com debounce: só consulta o banco depois que o operador para de
  // digitar (evita sobrecarga). Código exato é resolvido na hora (leitor).
  useEffect(() => {
    const term = searchTerm.trim();
    if (term.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    // Match exato por código (instantâneo, sem debounce nem rede)
    const exactMatch = products.find((p) => String(p.codigo).trim() === term);
    if (exactMatch) {
      setSearchResults([exactMatch]);
      setSearching(false);
      return;
    }

    // Feedback imediato de "buscando" + debounce de 350ms para busca por texto
    setSearching(true);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const reqId = ++requestIdRef.current;
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await api.products.search({ term, limit: 15 });
        if (reqId !== requestIdRef.current) return; // resultado obsoleto
        setSearchResults(results.filter((p) => p.estoque_atual > 0));
      } catch (err) {
        console.error("Erro na busca:", err);
        if (reqId === requestIdRef.current) setSearchResults([]);
      } finally {
        if (reqId === requestIdRef.current) setSearching(false);
      }
    }, 350);

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

  // Código lido pela câmera: se bater exatamente com um produto, adiciona;
  // senão joga o código na busca para o operador refinar.
  const scanCode = useCallback(
    (rawCode) => {
      const code = String(rawCode || "").trim();
      if (!code) return { found: false };
      const exact = products.find((p) => String(p.codigo).trim() === code);
      if (exact) {
        addToCart(exact);
        setSearchTerm("");
        setSearchResults([]);
        setTimeout(() => searchInputRef.current?.focus(), 10);
        return { found: true, product: exact };
      }
      setSearchTerm(code);
      setTimeout(() => searchInputRef.current?.focus(), 10);
      return { found: false, code };
    },
    [products, addToCart],
  );

  return {
    searchTerm,
    setSearchTerm,
    searchResults,
    searching,
    searchInputRef,
    handleSearchKeyDown,
    selectProduct,
    focusSearch,
    scanCode,
  };
};

export default useProductSearch;
