//
//  Message.swift
//  cbc
//
//  Created by Christopher Celaya on 12/25/25.
//

import Foundation

struct Message: Identifiable, Codable {
    let id: UUID
    let content: String
    let isUser: Bool
    let timestamp: Date
    var projectCards: [Project]?

    init(id: UUID = UUID(), content: String, isUser: Bool, timestamp: Date = Date(), projectCards: [Project]? = nil) {
        self.id = id
        self.content = content
        self.isUser = isUser
        self.timestamp = timestamp
        self.projectCards = projectCards
    }
}
