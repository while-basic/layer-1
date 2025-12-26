//
//  Project.swift
//  cbc
//
//  Created by Christopher Celaya on 12/25/25.
//

import Foundation

struct Project: Identifiable, Codable {
    let id: UUID
    let name: String
    let description: String
    let status: String
    let tech: [String]

    init(id: UUID = UUID(), name: String, description: String, status: String, tech: [String]) {
        self.id = id
        self.name = name
        self.description = description
        self.status = status
        self.tech = tech
    }
}
