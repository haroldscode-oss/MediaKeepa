import { useParams, Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "@phosphor-icons/react"
import { legalContent } from "@/lib/legal-content"
import { useEffect } from "react"

export function LegalPage() {
  const { page } = useParams<{ page: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page])
  
  if (!page || !legalContent[page]) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Page Not Found</h1>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  const content = legalContent[page]

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <motion.div
          key={`back-${page}`}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link to="/">
            <Button variant="ghost" size="sm" className="mb-2 sm:mb-4">
              <ArrowLeft className="mr-2" size={16} />
              Back to Home
            </Button>
          </Link>
        </motion.div>

        <motion.div
          key={`title-${page}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-2"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">{content.title}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Last Updated: {content.lastUpdated}
          </p>
        </motion.div>

        <motion.div
          key={`content-${page}`}
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.08,
              },
            },
          }}
          className="prose prose-sm sm:prose-base dark:prose-invert max-w-none space-y-4 sm:space-y-6 pb-8 sm:pb-12"
        >
          {content.sections.map((section, index) => (
            <motion.div
              key={index}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.5,
                    ease: "easeOut",
                  },
                },
              }}
              className="space-y-4"
            >
              {section.heading && (
                <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mt-6 sm:mt-8 first:mt-0">
                  {section.heading}
                </h2>
              )}
              {section.content.map((paragraph, pIndex) => (
                <p
                  key={pIndex}
                  className="text-sm sm:text-base text-foreground/90 leading-relaxed"
                >
                  {paragraph}
                </p>
              ))}
              {section.list && (
                <ul className="list-disc list-inside space-y-2 ml-2 sm:ml-4">
                  {section.list.map((item, lIndex) => (
                    <li
                      key={lIndex}
                      className="text-sm sm:text-base text-foreground/80"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          ))}

          {content.contactEmail && (
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.5,
                    ease: "easeOut",
                  },
                },
              }}
              className="mt-8 sm:mt-12 pt-4 sm:pt-6 border-t"
            >
              <p className="text-xs sm:text-sm text-muted-foreground">
                For questions or concerns, contact us at:{" "}
                <a
                  href={`mailto:${content.contactEmail}`}
                  className="text-foreground hover:underline font-medium break-all"
                >
                  {content.contactEmail}
                </a>
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
