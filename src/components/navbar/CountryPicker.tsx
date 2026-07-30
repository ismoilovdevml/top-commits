import { useRouter } from "next/router";
import { useMemo, useState } from "react";

import { ALL_COUNTRIES, DEFAULT_COUNTRY } from "@/lib/countries";
import styles from "./countryPicker.module.scss";

/** How many suggestions to render before the list stops being scannable. */
const MAX_RESULTS = 8;

const CountryPicker = ({ current }: { current: string }) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const pool = needle
      ? ALL_COUNTRIES.filter((country) =>
          country.title.toLocaleLowerCase().includes(needle)
        )
      : ALL_COUNTRIES;

    return pool.slice(0, MAX_RESULTS);
  }, [query]);

  const go = (slug: string) => {
    setOpen(false);
    setQuery("");
    router.push(slug === DEFAULT_COUNTRY ? "/" : `/${slug}`);
  };

  const currentCountry = ALL_COUNTRIES.find((country) => country.slug === current);

  return (
    <div className={styles.picker}>
      <input
        type="text"
        className={styles.input}
        placeholder={currentCountry ? `${currentCountry.flag} ${currentCountry.title}` : "Country"}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // Deferred so a click on an option registers before the list unmounts.
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        aria-label="Change country"
      />

      {open && matches.length > 0 && (
        <ul className={styles.results}>
          {matches.map((country) => (
            <li key={country.slug}>
              <button
                type="button"
                className={`${styles.result} ${
                  country.slug === current ? styles.resultActive : ""
                }`}
                onClick={() => go(country.slug)}
              >
                <span aria-hidden>{country.flag}</span>
                <span>{country.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CountryPicker;
