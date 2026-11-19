import { site } from '../../config/site';
import { whatsappLink } from '../../lib/whatsapp';
import { Icon } from '../ui/Icon';
import styles from './TopBar.module.css';

export function TopBar() {
  return (
    <div className={styles.bar}>
      <div className={`container ${styles.inner}`}>
        <ul role="list" className={styles.list}>
          <li className={styles.item}>
            <Icon name="clock" size={16} />
            <span className={styles.text}>Entrega en {site.deliveryTime}</span>
          </li>
          <li className={`${styles.item} ${styles.coverage}`}>
            <Icon name="mapPin" size={16} />
            <span className={styles.text}>{site.coverage}</span>
          </li>
        </ul>
        <a className={styles.wa} href={whatsappLink()} target="_blank" rel="noopener noreferrer">
          <Icon name="chat" size={16} />
          <span>
            WhatsApp<span className={styles.waNumber}> {site.whatsappDisplay}</span>
          </span>
        </a>
      </div>
    </div>
  );
}
