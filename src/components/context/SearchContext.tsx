import { SearchTerms } from "@/types/Common";
import React, { createContext, useMemo, useState } from "react";

type SetSearchTerms = {
  setSearchTerms: React.Dispatch<React.SetStateAction<SearchTerms>>;
};

export const SearchContext = createContext<SearchTerms & SetSearchTerms>({
  filterText: "",
  userType: "public",
  setSearchTerms: () => {},
});

const SearchProvider = ({ children }: { children: React.ReactNode }) => {
  const [searchTerms, setSearchTerms] = useState<SearchTerms>({
    filterText: "",
    userType: "public",
  });

  const value = useMemo(
    () => ({ ...searchTerms, setSearchTerms }),
    [searchTerms, setSearchTerms]
  );

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
};

export default SearchProvider;
