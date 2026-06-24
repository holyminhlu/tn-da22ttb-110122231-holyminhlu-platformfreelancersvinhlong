"use client";



import Link from "next/link";

import { useEffect, useState } from "react";

import {

  FaEnvelope,

  FaFacebookF,

  FaGlobe,

  FaInstagram,

  FaLinkedinIn,

  FaMapMarkerAlt,

  FaPhone,

  FaTwitter,

  FaYoutube,

} from "react-icons/fa";

import type { IconType } from "react-icons";

import { useTranslation } from "@/hooks/useTranslation";

import { getPublicContact, type ContactSocialLink, type SiteContact } from "@/lib/api/contact";

import type { ApiError } from "@/lib/api/client";

import "./contact.css";



const FALLBACK_CONTACT: SiteContact = {

  email: "vinhlongconnect@gmail.com",

  phone: "0983149203",

  address: "Tiểu Cần, Vĩnh Long",

  socialLinks: [

    { id: "fb", platform: "facebook", label: "Facebook", url: "", sortOrder: 1, isVisible: true },

    { id: "tw", platform: "twitter", label: "Twitter / X", url: "", sortOrder: 2, isVisible: true },

    { id: "li", platform: "linkedin", label: "LinkedIn", url: "", sortOrder: 3, isVisible: true },

  ],

};



const SOCIAL_ICONS: Record<string, IconType> = {

  facebook: FaFacebookF,

  twitter: FaTwitter,

  linkedin: FaLinkedinIn,

  youtube: FaYoutube,

  instagram: FaInstagram,

};



function socialIcon(platform: string): IconType {

  return SOCIAL_ICONS[platform.toLowerCase()] ?? FaGlobe;

}



function hasUrl(url: string): boolean {

  const trimmed = url.trim();

  return trimmed.length > 0 && trimmed !== "#";

}



function SocialItem({ link, comingSoonLabel }: { link: ContactSocialLink; comingSoonLabel: string }) {

  const Icon = socialIcon(link.platform);

  const active = hasUrl(link.url);



  if (active) {

    return (

      <a

        className="contact-social__item"

        href={link.url}

        target="_blank"

        rel="noopener noreferrer"

        aria-label={link.label}

      >

        <Icon aria-hidden />

        {link.label}

      </a>

    );

  }



  return (

    <span className="contact-social__item contact-social__item--disabled" aria-disabled="true">

      <Icon aria-hidden />

      {link.label}

      <span className="contact-social__badge">{comingSoonLabel}</span>

    </span>

  );

}



export default function ContactPageContent() {

  const { t } = useTranslation();

  const [contact, setContact] = useState<SiteContact | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");



  useEffect(() => {

    let cancelled = false;

    (async () => {

      setLoading(true);

      setError("");

      try {

        const data = await getPublicContact();

        if (!cancelled) setContact(data);

      } catch (err) {

        const apiErr = err as ApiError;

        if (!cancelled) {

          setContact(FALLBACK_CONTACT);

          if (apiErr.status !== 503) {

            setError(apiErr.message || t("contactPage.loadError"));

          }

        }

      } finally {

        if (!cancelled) setLoading(false);

      }

    })();

    return () => {

      cancelled = true;

    };

  }, [t]);



  const data = contact ?? FALLBACK_CONTACT;

  const phoneHref = data.phone.replace(/\s+/g, "");



  return (

    <div className="contact-page bg-white text-gray-900">

      <section className="contact-hero py-14 text-white md:py-20">

        <div className="contact-container text-center">

          <p className="mb-3 inline-flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-blue-300">

            <FaMapMarkerAlt aria-hidden />

            {t("contactPage.badge")}

          </p>

          <h1 className="mb-4 text-3xl font-bold leading-tight md:text-4xl">{t("contactPage.title")}</h1>

          <p className="contact-hero__subtitle">{t("contactPage.subtitle")}</p>

        </div>

      </section>



      <div className="contact-container contact-body">

        {loading ? (

          <p className="contact-loading">{t("contactPage.loading")}</p>

        ) : (

          <>

            {error ? <p className="contact-error">{error}</p> : null}



            <div className="contact-grid">

              <article className="contact-card">

                <span className="contact-card__icon" aria-hidden>

                  <FaEnvelope />

                </span>

                <p className="contact-card__label">{t("contactPage.email")}</p>

                <p className="contact-card__value">

                  <a className="contact-card__link" href={`mailto:${data.email}`}>

                    {data.email}

                  </a>

                </p>

              </article>



              <article className="contact-card">

                <span className="contact-card__icon" aria-hidden>

                  <FaPhone />

                </span>

                <p className="contact-card__label">{t("contactPage.phone")}</p>

                <p className="contact-card__value">

                  <a className="contact-card__link" href={`tel:${phoneHref}`}>

                    {data.phone}

                  </a>

                </p>

              </article>



              <article className="contact-card">

                <span className="contact-card__icon" aria-hidden>

                  <FaMapMarkerAlt />

                </span>

                <p className="contact-card__label">{t("contactPage.address")}</p>

                <p className="contact-card__value">{data.address}</p>

              </article>

            </div>



            {data.socialLinks.length > 0 ? (

              <section className="contact-social" aria-label={t("contactPage.socialAria")}>

                <h2 className="contact-social__title">{t("contactPage.socialTitle")}</h2>

                <p className="contact-social__desc">{t("contactPage.socialDesc")}</p>

                <div className="contact-social__grid">

                  {data.socialLinks.map((link) => (

                    <SocialItem key={link.id} link={link} comingSoonLabel={t("contactPage.comingSoon")} />

                  ))}

                </div>

              </section>

            ) : null}



            <p className="contact-note">

              {t("contactPage.helpNote")}{" "}

              <Link href="/help" className="contact-card__link">

                {t("contactPage.helpLink")}

              </Link>

              .

            </p>

          </>

        )}

      </div>

    </div>

  );

}


