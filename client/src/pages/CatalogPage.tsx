import { useId, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { GIROS, SORT_OPTIONS, type CategoryDTO, type ProductCardDTO } from '@publicidad/shared';
import { ProductCard } from '../components/catalog/ProductCard';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { LoadError, SkeletonGrid } from '../components/ui/Skeleton';
import { useApi } from '../lib/useApi';
import styles from './CatalogPage.module.css';

/**
 * Estado del catálogo = la URL.
 *  - /productos/:categoria  → una categoría (URL "bonita", la que enlaza el menú)
 *  - /productos?cat=a,b     → varias categorías
 *  - q, giro, rapida, diseno, orden → query params
 */
export function CatalogPage() {
  const { categoria } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const ids = { search: useId(), sort: useId(), giro: useId(), filters: useId() };

  const selectedCats = Array.from(
    new Set([...(categoria ? [categoria] : []), ...(params.get('cat')?.split(',') ?? [])]),
  ).filter(Boolean);
  const q = params.get('q') ?? '';
  const giro = params.get('giro') ?? '';
  const rapida = params.get('rapida') === '1';
  const diseno = params.get('diseno') === '1';
  const orden = params.get('orden') ?? 'populares';

  /** Navega a la URL canónica para el nuevo estado de filtros. */
  function update(next: {
    cats?: string[];
    q?: string;
    giro?: string;
    rapida?: boolean;
    diseno?: boolean;
    orden?: string;
  }) {
    const s = {
      cats: selectedCats,
      q,
      giro,
      rapida,
      diseno,
      orden,
      ...next,
    };
    const sp = new URLSearchParams();
    if (s.cats.length > 1) sp.set('cat', s.cats.join(','));
    if (s.q) sp.set('q', s.q);
    if (s.giro) sp.set('giro', s.giro);
    if (s.rapida) sp.set('rapida', '1');
    if (s.diseno) sp.set('diseno', '1');
    if (s.orden && s.orden !== 'populares') sp.set('orden', s.orden);
    const path = s.cats.length === 1 ? `/productos/${s.cats[0]}` : '/productos';
    const search = sp.toString();
    navigate(`${path}${search ? `?${search}` : ''}`, {
      replace: true,
      state: { keepScroll: true },
    });
  }

  const apiParams = new URLSearchParams();
  if (selectedCats.length) apiParams.set('cat', selectedCats.join(','));
  if (q) apiParams.set('q', q);
  if (giro) apiParams.set('giro', giro);
  if (rapida) apiParams.set('rapida', '1');
  if (diseno) apiParams.set('diseno', '1');
  apiParams.set('orden', orden);

  const cats = useApi<CategoryDTO[]>('/api/categories');
  const products = useApi<ProductCardDTO[]>(`/api/products?${apiParams}`);

  const currentCat =
    selectedCats.length === 1 ? cats.data?.find((c) => c.slug === selectedCats[0]) : undefined;
  const title = currentCat?.nombre ?? 'Todos los productos';
  const activeCount = selectedCats.length + (giro ? 1 : 0) + (rapida ? 1 : 0) + (diseno ? 1 : 0);

  function toggleCat(slug: string) {
    update({
      cats: selectedCats.includes(slug)
        ? selectedCats.filter((c) => c !== slug)
        : [...selectedCats, slug],
    });
  }

  function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = new FormData(e.currentTarget).get('q');
    update({ q: typeof value === 'string' ? value.trim() : '' });
  }

  return (
    <div className={`container ${styles.page}`}>
      <nav aria-label="Ruta de navegación" className={styles.breadcrumb}>
        <ol role="list">
          <li>
            <Link to="/">Inicio</Link>
          </li>
          <li>
            {currentCat ? (
              <Link to="/productos">Productos</Link>
            ) : (
              <span aria-current="page">Productos</span>
            )}
          </li>
          {currentCat && (
            <li>
              <span aria-current="page">{currentCat.nombre}</span>
            </li>
          )}
        </ol>
      </nav>

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          {currentCat?.descripcion && <p className={styles.subtitle}>{currentCat.descripcion}</p>}
        </div>

        <div className={styles.toolbar}>
          <form role="search" className={styles.search} onSubmit={onSearch} key={q}>
            <label htmlFor={ids.search} className="visually-hidden">
              Buscar productos
            </label>
            <input
              id={ids.search}
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Buscar: tarjetas, lona, playeras…"
              className={styles.input}
            />
            <button type="submit" className={styles.searchBtn} aria-label="Buscar">
              <Icon name="search" size={20} />
            </button>
          </form>

          <div className={styles.sort}>
            <label htmlFor={ids.sort}>Ordenar por</label>
            <select
              id={ids.sort}
              value={orden}
              onChange={(e) => update({ orden: e.target.value })}
              className={styles.select}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        <button
          type="button"
          className={styles.filtersToggle}
          aria-expanded={filtersOpen}
          aria-controls={ids.filters}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <Icon name="sliders" size={20} />
          Filtros{activeCount > 0 && ` (${activeCount})`}
        </button>

        <aside
          id={ids.filters}
          className={`${styles.sidebar} ${filtersOpen ? styles.sidebarOpen : ''}`}
          aria-label="Filtros"
        >
          <fieldset className={styles.group}>
            <legend className={styles.legend}>Categorías</legend>
            {cats.data?.map((c) => (
              <label key={c.slug} className={styles.check}>
                <input
                  type="checkbox"
                  checked={selectedCats.includes(c.slug)}
                  onChange={() => toggleCat(c.slug)}
                />
                <span>{c.nombre}</span>
                <span className={styles.count}>{c.totalProductos}</span>
              </label>
            ))}
          </fieldset>

          <div className={styles.group}>
            <label htmlFor={ids.giro} className={styles.legend}>
              Mi negocio es…
            </label>
            <select
              id={ids.giro}
              value={giro}
              onChange={(e) => update({ giro: e.target.value })}
              className={styles.select}
            >
              <option value="">Cualquier giro</option>
              {GIROS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <fieldset className={styles.group}>
            <legend className={styles.legend}>Entrega</legend>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={rapida}
                onChange={(e) => update({ rapida: e.target.checked })}
              />
              <span>Entrega rápida</span>
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={diseno}
                onChange={(e) => update({ diseno: e.target.checked })}
              />
              <span>Incluye diseño</span>
            </label>
          </fieldset>

          {activeCount > 0 && (
            <button
              type="button"
              className={styles.clear}
              onClick={() => update({ cats: [], giro: '', rapida: false, diseno: false, q: '' })}
            >
              Limpiar filtros
            </button>
          )}

          <div className={styles.promo}>
            <p className={styles.promoTitle}>¿Vas a pedir varias cosas?</p>
            <p className={styles.promoText}>
              Los paquetes por giro traen todo junto y cuestan menos que por separado.
            </p>
            <Button to={giro ? `/paquetes?giro=${giro}` : '/paquetes'} variant="light" block>
              Ver paquetes
            </Button>
          </div>
        </aside>

        <section aria-labelledby="results-title" className={styles.results}>
          <h2 id="results-title" className="visually-hidden">
            Resultados
          </h2>
          <p className={styles.resultCount} aria-live="polite">
            {products.data &&
              !products.loading &&
              `${products.data.length} ${products.data.length === 1 ? 'producto' : 'productos'}`}
          </p>

          {products.error && <LoadError message={products.error} />}
          {!products.data && products.loading && <SkeletonGrid count={6} />}
          {products.data && products.data.length === 0 && !products.loading && (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>No encontramos productos con esos filtros.</p>
              <p>Prueba con otra búsqueda o limpia los filtros.</p>
            </div>
          )}
          {products.data && products.data.length > 0 && (
            <ul
              role="list"
              className={`${styles.grid} ${products.loading ? styles.stale : ''}`}
              aria-busy={products.loading}
            >
              {products.data.map((p) => (
                <li key={p.slug}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
