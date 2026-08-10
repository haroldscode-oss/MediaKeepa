import { motion } from "framer-motion"
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog"
import { X } from "@phosphor-icons/react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { legalContent } from "@/lib/legal-content"

type LegalModalProps = {
  isOpen: boolean
  onClose: () => void
  page: string | null
}

export function LegalModal({ isOpen, onClose, page }: LegalModalProps) {
  if (!page) return null

  const content = legalContent[page]
  if (!content) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative flex flex-col h-full"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b bg-background/95 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <h2 className="text-2xl font-bold">{content.title}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Last Updated: {content.lastUpdated}
              </p>
            </motion.div>
            <DialogClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
              <X size={20} weight="bold" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>

          <ScrollArea className="flex-1 px-6 py-6">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.08,
                  },
                },
              }}
              className="prose prose-sm sm:prose-base dark:prose-invert max-w-none space-y-6"
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
                    <h3 className="text-lg font-semibold text-foreground mt-8 first:mt-0">
                      {section.heading}
                    </h3>
                  )}
                  {section.content.map((paragraph, pIndex) => (
                    <motion.p
                      key={pIndex}
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          transition: {
                            duration: 0.4,
                            ease: "easeOut",
                          },
                        },
                      }}
                      className="text-foreground/90 leading-relaxed"
                    >
                      {paragraph}
                    </motion.p>
                  ))}
                  {section.list && (
                    <motion.ul
                      variants={{
                        hidden: { opacity: 0 },
                        visible: {
                          opacity: 1,
                          transition: {
                            staggerChildren: 0.05,
                          },
                        },
                      }}
                      className="list-disc list-inside space-y-2 ml-4"
                    >
                      {section.list.map((item, lIndex) => (
                        <motion.li
                          key={lIndex}
                          variants={{
                            hidden: { opacity: 0, x: -10 },
                            visible: {
                              opacity: 1,
                              x: 0,
                              transition: {
                                duration: 0.3,
                              },
                            },
                          }}
                          className="text-foreground/80"
                        >
                          {item}
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}
                  {section.contentAfter?.map((paragraph, pIndex) => (
                    <motion.p
                      key={`after-${pIndex}`}
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          transition: { duration: 0.4, ease: "easeOut" },
                        },
                      }}
                      className="text-foreground/90 leading-relaxed"
                    >
                      {paragraph}
                    </motion.p>
                  ))}
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
                  className="mt-12 pt-6 border-t"
                >
                  <p className="text-sm text-muted-foreground">
                    For questions or concerns, contact us at:{" "}
                    <a
                      href={`mailto:${content.contactEmail}`}
                      className="text-foreground hover:underline font-medium"
                    >
                      {content.contactEmail}
                    </a>
                  </p>
                </motion.div>
              )}
            </motion.div>
          </ScrollArea>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
